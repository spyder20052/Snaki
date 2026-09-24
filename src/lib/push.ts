// ===========================================================================
// SNAKI — NOTIFICATIONS PUSH (cote client)
// ===========================================================================
// Demande l'autorisation au client, puis enregistre son abonnement pour que
// le serveur puisse le notifier de l'avancement de sa commande.
//
// Le client doit AUTORISER explicitement, comme pour une application. Tant
// qu'il ne l'a pas fait, aucune notification ne peut lui parvenir — c'est
// une regle du navigateur, pas un choix d'implementation.

import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Etat du canal de notification, pour piloter l'interface. */
export type PushState =
  | 'unsupported'   // navigateur trop ancien, ou iPhone hors ecran d'accueil
  | 'default'       // jamais demande : on peut proposer
  | 'granted'       // autorise
  | 'denied'        // refuse : seul le client peut revenir en arriere

/** La cle publique VAPID doit etre transmise au navigateur en octets.
 *
 *  On renvoie l'`ArrayBuffer` et non la vue `Uint8Array` : selon la version
 *  des types DOM, `Uint8Array` peut etre adosse a un `SharedArrayBuffer`,
 *  que `applicationServerKey` n'accepte pas. */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

/** Le push est-il utilisable dans ce navigateur ?
 *
 *  Sur iPhone, `PushManager` n'existe QUE si le site a ete ajoute a l'ecran
 *  d'accueil : c'est une contrainte d'Apple. Ce test la couvre donc sans
 *  avoir a detecter le systeme. */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && !!VAPID_PUBLIC
}

export function pushState(): PushState {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission as PushState
}

/** Vrai sur un iPhone/iPad qui n'est PAS lance depuis l'ecran d'accueil :
 *  dans ce cas il faut expliquer au client comment y ajouter le site, sinon
 *  la demande d'autorisation n'aboutira jamais. */
export function needsHomeScreen(): boolean {
  if (typeof window === 'undefined') return false
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
  return isApple && !standalone && !('PushManager' in window)
}

/** Enregistre le service worker. Idempotent : appelable a chaque visite. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    // Un echec d'enregistrement ne doit jamais casser le site : les
    // notifications sont un plus, pas une fonction vitale.
    return null
  }
}

/** Demande l'autorisation et enregistre l'abonnement en base.
 *
 *  `phone` rattache l'abonnement au client : c'est la seule information
 *  qu'on stocke avec l'endpoint, et elle sert uniquement a savoir a qui
 *  envoyer la notification de SA commande. */
export async function enablePush(phone?: string): Promise<{
  ok: boolean
  reason?: string
}> {
  if (!isPushSupported()) {
    return {
      ok: false,
      reason: needsHomeScreen()
        ? 'Sur iPhone, ajoutez d’abord Snaki à votre écran d’accueil (Partager › Sur l’écran d’accueil).'
        : 'Votre navigateur ne gère pas les notifications.',
    }
  }

  // L'autorisation doit etre demandee depuis un geste de l'utilisateur
  // (clic) : les navigateurs rejettent une demande spontanee.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      ok: false,
      reason: permission === 'denied'
        ? 'Notifications refusées. Vous pouvez les réactiver dans les réglages de votre navigateur.'
        : 'Autorisation non accordée.',
    }
  }

  const registration = await registerServiceWorker()
  if (!registration) return { ok: false, reason: 'Service worker indisponible.' }
  // Attend que le service worker soit pret : s'abonner avant echoue.
  await navigator.serviceWorker.ready

  try {
    // Reutilise l'abonnement existant s'il y en a un, sinon en cree un.
    const existing = await registration.pushManager.getSubscription()
    const sub = existing ?? await registration.pushManager.subscribe({
      // Obligatoire : le navigateur refuse un abonnement qui ne serait pas
      // reserve a des notifications visibles par le client.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC!),
    })

    const json = sub.toJSON() as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return { ok: false, reason: 'Abonnement incomplet.' }
    }

    // `upsert` sur l'endpoint : un client qui reautorise ne cree pas de
    // doublon, et un abonnement desactive redevient actif.
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      phone: phone?.replace(/\D/g, '') || null,
      user_agent: navigator.userAgent.slice(0, 200),
      active: true,
    }, { onConflict: 'endpoint' })

    if (error) return { ok: false, reason: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Échec de l’abonnement.' }
  }
}

/** Desactive les notifications : supprime l'abonnement du navigateur ET le
 *  desactive en base, pour que le serveur cesse d'y envoyer des messages.
 *
 *  Note : l'AUTORISATION du navigateur, elle, ne peut pas etre revoquee par
 *  le code — seul le client peut le faire dans les reglages. On se contente
 *  donc de couper le canal, ce qui suffit : sans abonnement, aucune
 *  notification ne part. */
export async function disablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: true }
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const sub = await registration?.pushManager.getSubscription()
    if (!sub) return { ok: true }

    // Desactive d'abord en base : si le desabonnement local reussit mais que
    // la base reste a jour, le serveur continuerait a tenter des envois.
    await supabase.from('push_subscriptions')
      .update({ active: false })
      .eq('endpoint', sub.endpoint)

    await sub.unsubscribe()
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Échec de la désactivation.' }
  }
}

/** Y a-t-il un abonnement actif dans ce navigateur ? Sert a afficher le bon
 *  bouton (activer / desactiver) sans se fier a la seule autorisation, qui
 *  peut rester « accordee » alors que l'abonnement a ete supprime. */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    return !!(await registration?.pushManager.getSubscription())
  } catch {
    return false
  }
}

/** Rattache un abonnement deja enregistre au telephone saisi a la commande.
 *  Appele au moment du checkout : le client a pu autoriser les
 *  notifications avant d'avoir renseigne son numero. */
export async function linkPushToPhone(phone: string): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const sub = await registration?.pushManager.getSubscription()
    if (!sub) return
    await supabase.from('push_subscriptions')
      .update({ phone: phone.replace(/\D/g, ''), active: true })
      .eq('endpoint', sub.endpoint)
  } catch {
    // Sans consequence : la notification partira au pire sans rattachement.
  }
}

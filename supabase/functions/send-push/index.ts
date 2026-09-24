// ===========================================================================
// SNAKI — ENVOI DES NOTIFICATIONS PUSH (Supabase Edge Function)
// ===========================================================================
// Depile `push_queue` et envoie chaque notification aux navigateurs abonnes.
//
// Pourquoi cette fonction existe : signer un message push exige la cle
// privee VAPID. Dans le navigateur elle serait publique, donc n'importe qui
// pourrait notifier vos clients. Elle reste donc ici, cote serveur, dans les
// secrets Supabase.
//
// Le protocole (RFC 8291 / 8292) demande trois choses :
//   1. un jeton JWT signe avec la cle privee VAPID (l'authentification),
//   2. le chiffrement du message avec les cles du navigateur (aes128gcm),
//   3. un POST vers l'endpoint fourni par le navigateur.
//
// Deploiement et secrets : voir supabase/PUSH-SETUP.md

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// Cle de service : elle contourne le RLS, ce qui est necessaire ici pour
// lire les abonnements de tous les clients. Elle ne quitte jamais le serveur.
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
// Adresse de contact exigee par les services push, pour vous joindre en cas
// d'abus depuis votre serveur.
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contactsnaki@gmail.com'

const db = createClient(SUPABASE_URL, SERVICE_KEY)

// --- OUTILS BASE64URL ------------------------------------------------------

const b64urlToBytes = (s: string): Uint8Array => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = pad + '='.repeat((4 - (pad.length % 4)) % 4)
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

const bytesToB64url = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const utf8 = (s: string) => new TextEncoder().encode(s)

const concat = (...arrays: Uint8Array[]): Uint8Array => {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

// --- JWT VAPID -------------------------------------------------------------

/** Construit le jeton d'authentification exige par le service push. Il
 *  prouve que la requete vient bien du detenteur de la cle privee. */
async function vapidToken(endpoint: string): Promise<string> {
  const { origin } = new URL(endpoint)
  const header = bytesToB64url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bytesToB64url(utf8(JSON.stringify({
    aud: origin,
    // Validite de 12 h : au-dela, les services push rejettent le jeton.
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })))
  const unsigned = `${header}.${payload}`

  // La cle privee VAPID est le scalaire `d` : on reconstruit une JWK pour
  // l'importer. Les coordonnees x/y viennent de la cle publique.
  const pub = b64urlToBytes(VAPID_PUBLIC)
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      d: VAPID_PRIVATE,
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, utf8(unsigned),
  )
  return `${unsigned}.${bytesToB64url(new Uint8Array(sig))}`
}

// --- CHIFFREMENT DU MESSAGE (aes128gcm, RFC 8291) --------------------------

/** Derive une cle via HKDF, brique de base du chiffrement push. */
async function hkdf(
  salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8,
  )
  return new Uint8Array(bits)
}

/** Chiffre le message pour un abonnement donne. Le service push ne peut pas
 *  lire le contenu : seul le navigateur du client possede la cle de
 *  dechiffrement. */
async function encrypt(payload: string, p256dh: string, auth: string) {
  const clientPub = b64urlToBytes(p256dh)
  const authSecret = b64urlToBytes(auth)

  // Paire ephemere : une nouvelle a chaque envoi (exigence du protocole).
  const local = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  ) as CryptoKeyPair
  const localPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', local.publicKey),
  )

  const clientKey = await crypto.subtle.importKey(
    'raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )
  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey }, local.privateKey, 256,
  ))

  // Secret pseudo-aleatoire, lie aux deux parties.
  const prkInfo = concat(
    utf8('WebPush: info\0'), clientPub, localPubRaw,
  )
  const prk = await hkdf(authSecret, shared, prkInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, prk, utf8('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, prk, utf8('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // Le corps est termine par 0x02 (dernier enregistrement), puis chiffre.
  const body = concat(utf8(payload), new Uint8Array([2]))
  const sealed = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, body,
  ))

  // En-tete : salt (16) + taille d'enregistrement (4) + longueur cle (1) + cle.
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([localPubRaw.length]), localPubRaw, sealed)
}

// --- ENVOI -----------------------------------------------------------------

interface Subscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/** Envoie une notification a un abonnement. Retourne le code HTTP pour que
 *  l'appelant sache s'il faut desactiver l'abonnement. */
async function send(sub: Subscription, title: string, body: string, url: string) {
  const payload = JSON.stringify({ title, body, url })
  const [token, cipher] = await Promise.all([
    vapidToken(sub.endpoint),
    encrypt(payload, sub.p256dh, sub.auth),
  ])

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${VAPID_PUBLIC}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      // 24 h de conservation si l'appareil est hors ligne.
      TTL: '86400',
      Urgency: 'high',
    },
    body: cipher,
  })
  return res.status
}

// --- POINT D'ENTREE --------------------------------------------------------

Deno.serve(async (req) => {
  // Repond au preflight CORS, pour un declenchement depuis le dashboard.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const results = { sent: 0, failed: 0, skipped: 0, disabled: 0 }

  // On traite par lots : une invocation ne doit pas depasser son temps
  // d'execution, meme si la file est longue.
  const { data: queue, error } = await db
    .from('push_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  for (const item of queue ?? []) {
    // Retrouve les abonnements du client : par identifiant si la fiche
    // existe, sinon par telephone (commande passee sans compte).
    let q = db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('active', true)
    q = item.customer_id
      ? q.eq('customer_id', item.customer_id)
      : q.eq('phone', item.phone)
    const { data: subs } = await q

    if (!subs || subs.length === 0) {
      // Aucun abonnement : le client n'a pas autorise les notifications.
      // On marque `skipped` plutot que `failed` — ce n'est pas une erreur.
      await db.from('push_queue')
        .update({ status: 'skipped', error: 'Aucun abonnement actif' })
        .eq('id', item.id)
      results.skipped++
      continue
    }

    let ok = 0
    const errors: string[] = []

    for (const sub of subs as Subscription[]) {
      try {
        const status = await send(sub, item.title, item.body, item.url ?? '/')
        if (status >= 200 && status < 300) {
          ok++
          await db.from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)
        } else if (status === 404 || status === 410) {
          // Abonnement expire ou revoque : on le desactive pour ne pas
          // reessayer indefiniment.
          await db.from('push_subscriptions')
            .update({ active: false }).eq('id', sub.id)
          results.disabled++
        } else {
          errors.push(`HTTP ${status}`)
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    await db.from('push_queue').update({
      status: ok > 0 ? 'sent' : 'failed',
      attempts: (item.attempts ?? 0) + 1,
      error: errors.length ? errors.join('; ') : null,
      sent_at: ok > 0 ? new Date().toISOString() : null,
    }).eq('id', item.id)

    ok > 0 ? results.sent++ : results.failed++
  }

  return Response.json(results, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
})

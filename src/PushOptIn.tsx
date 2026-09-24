// ===========================================================================
// SNAKI — INVITATION A ACTIVER LES NOTIFICATIONS
// ===========================================================================
// Propose au client de suivre sa commande par notification. Affiche juste
// apres la confirmation : c'est le moment ou il a une vraie raison
// d'accepter, donc celui ou il accepte le plus volontiers.
//
// Le composant se retire tout seul quand le push est indisponible ou deja
// autorise : rien a decider cote appelant.

import { useEffect, useState } from 'react'
import { enablePush, hasActiveSubscription, isPushSupported, needsHomeScreen, pushState } from './lib/push'

export function PushOptIn({ phone }: { phone?: string }) {
  const [state, setState] = useState(() => pushState())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  // `null` = verification en cours. On se fie a l'ABONNEMENT et non a la
  // seule autorisation du navigateur : celle-ci reste « accordee » apres
  // une desactivation depuis l'espace client, si bien que ce bloc
  // annoncait a tort « tu recevras une notification ».
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  // Sur iPhone hors ecran d'accueil, `PushManager` n'existe pas : on
  // explique la manipulation plutot que de masquer le bloc, sinon le client
  // ne comprend pas pourquoi il ne recoit rien.
  const [needsInstall] = useState(() => needsHomeScreen())

  useEffect(() => {
    setState(pushState())
    hasActiveSubscription().then(setSubscribed)
  }, [])

  if (needsInstall) {
    return (
      <p className="push-optin-hint">
        Pour suivre ta commande par notification, ajoute Snaki à ton écran
        d’accueil : <strong>Partager › Sur l’écran d’accueil</strong>.
      </p>
    )
  }

  // Navigateur incapable, ou refus definitif : inutile d'insister.
  if (!isPushSupported() || state === 'denied') return null

  // Autorise ET abonne : rien a proposer, on confirme simplement.
  if (state === 'granted' && subscribed === true) {
    return (
      <p className="push-optin-hint">
        Tu recevras une notification à chaque étape de ta commande.
      </p>
    )
  }

  // Verification encore en cours : on n'affiche rien plutot qu'une
  // information qui pourrait etre dementie une fraction de seconde apres.
  if (state === 'granted' && subscribed === null) return null

  return (
    <div className="push-optin">
      <button
        type="button"
        data-cursor-hide
        className="push-optin-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setMessage('')
          const res = await enablePush(phone)
          setState(pushState())
          setSubscribed(await hasActiveSubscription())
          if (!res.ok && res.reason) setMessage(res.reason)
          setBusy(false)
        }}
      >
        {/* Icone en SVG et non en emoji : un emoji change de dessin selon
            l'appareil (Apple, Android, Windows), et ne suit pas la couleur
            du texte. Le trace ci-dessous est net partout et herite de
            `currentColor`. */}
        {!busy && (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 8a6 6 0 1 0-12 0c0 4-1.5 5.5-2 6h16c-.5-.5-2-2-2-6"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M10.5 18a1.8 1.8 0 0 0 3 0"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            />
          </svg>
        )}
        {busy ? 'Activation…' : 'Suivre ma commande'}
      </button>
      {message && <p className="push-optin-hint">{message}</p>}
    </div>
  )
}

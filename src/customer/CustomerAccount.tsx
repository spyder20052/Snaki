import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadCheckoutProfile, loadSimulatedOrders, saveCheckoutProfile } from '../lib/localCommerce'
import { useAdminArea } from '../admin/ui'
import { disablePush, enablePush, hasActiveSubscription, isPushSupported } from '../lib/push'
import { supabase } from '../lib/supabase'
import type { Order, OrderStatus } from '../admin/types'
import './customer.css'

const SESSION_KEY = 'snaki.customer-session.v1'
const labels: Record<OrderStatus,string> = { new:'Reçue',pending:'En attente',confirmed:'Confirmée',preparing:'En préparation',ready:'Prête',delivering:'En livraison',delivered:'Livrée',picked_up:'Récupérée',completed:'Terminée',cancelled:'Annulée',refunded:'Remboursée' }
const active = new Set<OrderStatus>(['new','pending','confirmed','preparing','ready','delivering'])
const money = (value:number) => `${value.toLocaleString('fr-FR')} F`
const date = (value:string) => new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
/** Salutation selon l'heure locale du client. « Bonsoir » des 18 h, comme
 *  a l'oral ; « Bonjour » couvre le matin et l'apres-midi. */
const greeting = () => {
  const h = new Date().getHours()
  if (h < 6) return 'Bonne nuit'
  if (h < 18) return 'Bonjour'
  return 'Bonsoir'
}

function Icon({name}:{name:'orders'|'wallet'|'user'|'pin'|'support'|'arrow'|'logout'}) {
  const paths = { orders:'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6',wallet:'M3 7h18v12H3V7Zm0 0 3-3h12v3m-2 5h5',user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',pin:'M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6',support:'M4 14v-3a8 8 0 0 1 16 0v3M4 14h3v5H5a1 1 0 0 1-1-1v-4Zm16 0h-3v5h2a1 1 0 0 0 1-1v-4Z',arrow:'m9 18 6-6-6-6',logout:'M10 5H5v14h5m4-4 4-3-4-3m4 3H9'}
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>
}

export function CustomerAccount() {
  // Marque <body> comme zone applicative : le site public masque le curseur
  // natif (`cursor:none`) pour afficher son curseur bulle, qui n'est pas
  // rendu ici. Sans ce marqueur, l'espace client se retrouvait sans aucun
  // pointeur visible. Meme mecanisme que le dashboard.
  useAdminArea()
  const [phone,setPhone] = useState(()=>localStorage.getItem(SESSION_KEY)||'')
  const [input,setInput] = useState(phone || loadCheckoutProfile().phone)
  const [profile,setProfile] = useState(loadCheckoutProfile)
  const [editing,setEditing] = useState(false)
  // Session Google : `undefined` tant qu'on n'a pas interroge Supabase, pour
  // ne pas afficher brievement l'ecran de connexion a quelqu'un de deja
  // connecte (le jeton est relu de facon asynchrone au demarrage).
  const [account,setAccount] = useState<{email?:string;name?:string}|null|undefined>(undefined)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({data}) => {
      if (!alive) return
      const u = data.session?.user
      setAccount(u ? { email: u.email, name: u.user_metadata?.full_name as string|undefined } : null)
      // Google fournit le nom : on le pre-remplit si le profil est vide,
      // pour eviter au client de le retaper.
      if (u?.user_metadata?.full_name) {
        setProfile(p => p.name ? p : { ...p, name: u.user_metadata.full_name as string })
      }
    })
    // Le retour de redirection Google arrive apres le premier rendu :
    // sans cet ecouteur, l'ecran resterait bloque sur la connexion.
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return
      const u = session?.user
      setAccount(u ? { email: u.email, name: u.user_metadata?.full_name as string|undefined } : null)
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])
  const orders = useMemo(()=>loadSimulatedOrders().filter(order=>order.customerPhone.replace(/\s/g,'')===phone.replace(/\s/g,'')),[phone])
  const total = orders.filter(order=>!['cancelled','refunded'].includes(order.status)).reduce((sum,order)=>sum+order.total,0)
  const current = orders.find(order=>active.has(order.status))

  // Ecran de connexion, en deux temps :
  //   1. Google (facultatif) : identifie la personne et pre-remplit son nom.
  //   2. Numero de telephone (obligatoire) : c'est LUI qui relie le compte
  //      aux commandes, puisque le checkout se fait au numero. Google donne
  //      un e-mail, jamais un numero — d'ou cette seconde etape.
  if (!phone) return <div className="customer-login">
    <section className="customer-login-card">
      <Link className="customer-back" to="/bobas"><Icon name="arrow"/> Retour aux bobas</Link>
      <p className="customer-kicker">Espace client Snaki</p>
      <h1>Retrouve tes commandes.</h1>

      {account === undefined ? (
        <p>Vérification de ta session…</p>
      ) : account ? (
        <>
          <p className="customer-signed">
            Connecté avec <strong>{account.email}</strong>.
            {' '}Indique le numéro utilisé pour tes commandes.
          </p>
        </>
      ) : (
        <>
          <p>Connecte-toi avec Google, ou saisis directement le numéro utilisé lors de ta commande.</p>
          <button
            type="button"
            className="customer-google"
            onClick={() => {
              // `redirectTo` ramene sur cette page apres l'authentification.
              // L'URL doit etre declaree dans Supabase (Authentication >
              // URL Configuration), sinon la redirection est refusee.
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/compte` },
              })
            }}
          >
            {/* Logo Google officiel : quatre traces, une par couleur de la
                marque. Un SVG plutot qu'une image pour rester net a toute
                taille et ne pas dependre d'un fichier externe. */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86a5.36 5.36 0 0 1-5.03-3.7H1.05v2.34A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H1.05a9 9 0 0 0 0 8.12l2.92-2.34Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 1.05 4.94l2.92 2.34A5.36 5.36 0 0 1 9 3.58Z"/>
            </svg>
            Continuer avec Google
          </button>
          <div className="customer-or"><span>ou</span></div>
        </>
      )}

      <form onSubmit={event=>{event.preventDefault();const value=input.trim();if(!value)return;localStorage.setItem(SESSION_KEY,value);setPhone(value);saveCheckoutProfile({...profile,phone:value})}}>
        <label htmlFor="customer-phone">Numéro de téléphone</label>
        <input id="customer-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex. 01 97 00 00 00" value={input} onChange={event=>setInput(event.target.value)}/>
        <button type="submit">Accéder à mon espace <Icon name="arrow"/></button>
      </form>
      <small>Ton numéro relie ton compte à tes commandes. Il reste sur cet appareil.</small>
    </section>
  </div>

  const saveProfile = () => { saveCheckoutProfile(profile); setEditing(false) }
  return <div className="customer-area">
    <header className="customer-header">
      <Link className="customer-wordmark" to="/">Snaki</Link>

      {/* Deconnexion complete : on coupe AUSSI la session Google, sinon le
          client resterait identifie au retour sur la page. */}
      <button onClick={async ()=>{localStorage.removeItem(SESSION_KEY);await supabase.auth.signOut();setAccount(null);setPhone('')}}><Icon name="logout"/> Déconnexion</button>
    </header>
    <div className="customer-shell">
      <section className="customer-welcome">
        <div><p className="customer-kicker">Mon espace</p><h1>{greeting()} {profile.name?.split(' ')[0] || 'chez Snaki'}.</h1><p>Tout ce qu’il faut pour suivre tes boissons et gérer tes informations.</p></div>
        <Link to="/bobas">Commander à nouveau <Icon name="arrow"/></Link>
      </section>

      <section className="customer-stats" aria-label="Résumé du compte">
        <article><Icon name="orders"/><span>Commandes</span><strong>{orders.length}</strong></article>
        <article><Icon name="wallet"/><span>Total dépensé</span><strong>{money(total)}</strong></article>
        <article><Icon name="pin"/><span>En cours</span><strong>{orders.filter(order=>active.has(order.status)).length}</strong></article>
      </section>

      <div className="customer-grid">
        <section className="customer-orders" id="commandes">
          <div className="customer-section-head"><div><span>01</span><h2>Mes commandes</h2></div><small>{orders.length} au total</small></div>
          {current && <CurrentOrder order={current}/>} 
          {orders.length ? <div className="customer-order-list">{orders.map(order=><article key={order.id}>
            <div><strong>{order.reference}</strong><small>{date(order.createdAt)}</small></div>
            <div><span className={`customer-status status-${order.status}`}>{labels[order.status]}</span><small>{order.items.reduce((sum,item)=>sum+item.qty,0)} article(s)</small></div>
            <b>{money(order.total)}</b>
          </article>)}</div> : <div className="customer-empty"><Icon name="orders"/><h3>Aucune commande retrouvée</h3><p>Passe une commande avec le numéro <strong>{phone}</strong> pour la voir ici.</p><Link to="/bobas">Découvrir les bobas</Link></div>}
        </section>

        <aside className="customer-side">
          <section id="profil" className="customer-profile">
            <div className="customer-section-head"><div><span>02</span><h2>Mes informations</h2></div><button onClick={()=>editing?saveProfile():setEditing(true)}>{editing?'Enregistrer':'Modifier'}</button></div>
            <label>Nom<input disabled={!editing} autoComplete="name" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
            <label>Téléphone<input disabled value={phone}/></label>
            <label>E-mail<input disabled={!editing} type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></label>
            <label>Adresse<input disabled={!editing} value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})}/></label>
            <label>Zone<input disabled={!editing} value={profile.zone} onChange={e=>setProfile({...profile,zone:e.target.value})}/></label>
          </section>
          <NotificationSetting phone={phone} />
          <section className="customer-help"><Icon name="support"/><div><h2>Besoin d’aide ?</h2><p>Une question sur une commande ou une livraison ?</p></div><a href="mailto:contactsnaki@gmail.com">Contacter Snaki <Icon name="arrow"/></a></section>
        </aside>
      </div>
    </div>
  </div>
}

/** Reglage des notifications : le client peut les activer ET les couper
 *  depuis son espace, sans passer par les reglages du navigateur.
 *
 *  On se fie a la presence d'un ABONNEMENT et non a la seule autorisation :
 *  l'autorisation peut rester « accordee » alors que l'abonnement a ete
 *  supprime, auquel cas plus rien n'arrive et il faut pouvoir se
 *  reabonner. */
function NotificationSetting({phone}:{phone:string}) {
  const [on,setOn] = useState<boolean|null>(null)
  const [busy,setBusy] = useState(false)
  const [note,setNote] = useState('')

  useEffect(() => { hasActiveSubscription().then(setOn) }, [])

  if (!isPushSupported()) {
    return <section className="customer-notify">
      <div><h2>Notifications</h2>
        <p>Ce navigateur ne gère pas les notifications. Sur iPhone, ajoute
          Snaki à ton écran d’accueil pour en profiter.</p></div>
    </section>
  }

  // `null` = etat encore inconnu : on n'affiche pas de bouton qui pourrait
  // annoncer le contraire de la realite.
  if (on === null) {
    return <section className="customer-notify">
      <div><h2>Notifications</h2><p>Vérification…</p></div>
    </section>
  }

  return <section className="customer-notify">
    <div>
      <h2>Notifications</h2>
      <p>{on
        ? 'Tu reçois une notification à chaque étape de tes commandes.'
        : 'Active les notifications pour suivre tes commandes en direct.'}</p>
      {note && <small>{note}</small>}
    </div>
    <button
      type="button"
      className={on ? 'is-off' : ''}
      disabled={busy}
      onClick={async () => {
        setBusy(true); setNote('')
        const res = on ? await disablePush() : await enablePush(phone)
        if (res.ok) {
          setOn(!on)
          setNote(on ? 'Notifications désactivées.' : 'Notifications activées.')
        } else if (res.reason) {
          setNote(res.reason)
        }
        setBusy(false)
      }}
    >{busy ? '…' : on ? 'Désactiver' : 'Activer'}</button>
  </section>
}

function CurrentOrder({order}:{order:Order}) {
  const stages:OrderStatus[]=['new','confirmed','preparing','ready','delivering','delivered']
  const index = Math.max(0,stages.indexOf(order.status))
  return <article className="customer-current"><div className="customer-current-top"><div><small>Commande en cours</small><strong>{order.reference}</strong></div><b>{money(order.total)}</b></div><div className="customer-progress">{stages.map((stage,i)=><div className={i<=index?'done':''} key={stage}><i/><span>{labels[stage]}</span></div>)}</div><p><Icon name="pin"/>{order.zoneName || 'Zone à confirmer'} · {order.address}</p></article>
}

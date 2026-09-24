import { Icon } from './Icon'
import './console.css'
import { AuthGate } from './AuthGate'
import { supabase } from '../lib/supabase'
import { connectionState, currentAdminId } from './store'
// ===========================================================================
// SNAKI — DASHBOARD D'ADMINISTRATION
// ===========================================================================
// Coquille du dashboard : sidebar, en-tete, recherche globale, et routage
// vers les pages. Chaque page vit dans `pages/`.
//
// Les permissions filtrent la navigation ET les pages : masquer un lien ne
// suffit pas, la page elle-meme verifie le droit avant de s'afficher. Cote
// serveur, Supabase appliquera les memes regles via RLS — le controle
// front n'est qu'une commodite, jamais une securite.

import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import snakiLogo from '../assets/snaki-logo-transparent.png'
import { ROLES, useData } from './store'
import type { Permission } from './types'
import { Button, EmptyState, SearchInput, useAdminArea } from './ui'

import { OverviewPage } from './pages/ConsoleOverview'
import { OrdersPage } from './pages/Orders'
import { ProductsPage } from './pages/Products'
import { CategoriesPage } from './pages/Categories'
import { ContentPage } from './pages/Content'
import { MediaPage } from './pages/Media'
import { CustomersPage } from './pages/Customers'
import { PaymentsPage } from './pages/Payments'
import { ExpensesPage } from './pages/Expenses'
import { PromotionsPage } from './pages/Promotions'
import { ZonesPage } from './pages/Zones'
import { ReviewsPage } from './pages/Reviews'
import { AnalyticsPage } from './pages/Analytics'
import { FunnelPage } from './pages/Funnel'
import { ActivityPage } from './pages/Activity'
import { NotificationsPage } from './pages/Notifications'
import { SettingsPage } from './pages/Settings'
import { UsersPage } from './pages/Users'

// --- NAVIGATION ------------------------------------------------------------

interface NavEntry {
  to: string
  label: string
  icon: string
  permission?: Permission
  /** Compteur affiche a droite du lien (commandes en attente, avis...). */
  badge?: (d: ReturnType<typeof useData>) => number
}

const NAV_GROUPS: { title: string; items: NavEntry[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '', label: 'Vue d’ensemble', icon: 'overview', permission: 'analytics.view' },
      {
        to: 'orders', label: 'Commandes', icon: 'orders', permission: 'orders.view',
        badge: d => d.orders.filter(o => o.status === 'new' || o.status === 'pending').length,
      },
      { to: 'payments', label: 'Paiements', icon: 'payments', permission: 'finance.view' },
      { to: 'expenses', label: 'Dépenses', icon: 'payments', permission: 'finance.view' },
      { to: 'customers', label: 'Clients', icon: 'customers', permission: 'customers.view' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      {
        to: 'products', label: 'Boissons', icon: 'products', permission: 'products.view',
        badge: d => d.products.filter(p => p.status === 'active').length,
      },
      { to: 'categories', label: 'Catégories', icon: 'categories', permission: 'products.view' },
      { to: 'promotions', label: 'Promotions', icon: 'promotions', permission: 'promotions.edit' },
      { to: 'zones', label: 'Zones de livraison', icon: 'zones', permission: 'settings.edit' },
    ],
  },
  {
    title: 'Site public',
    items: [
      { to: 'content', label: 'Contenu du site', icon: 'content', permission: 'content.edit' },
      { to: 'media', label: 'Médiathèque', icon: 'media', permission: 'media.edit' },
      {
        to: 'reviews', label: 'Avis', icon: 'reviews', permission: 'content.edit',
        badge: d => d.reviews.filter(r => r.status === 'pending').length,
      },
    ],
  },
  {
    title: 'Mesure',
    items: [
      { to: 'analytics', label: 'Analytics', icon: 'analytics', permission: 'analytics.view' },
      { to: 'funnel', label: 'Panier & conversion', icon: 'funnel', permission: 'analytics.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: 'activity', label: 'Journal d’activité', icon: 'activity' },
      {
        to: 'notifications', label: 'Notifications', icon: 'notifications',
        badge: d => d.notifications.filter(n => !n.read).length,
      },
      { to: 'users', label: 'Utilisateurs & rôles', icon: 'users', permission: 'users.manage' },
      { to: 'settings', label: 'Paramètres', icon: 'settings', permission: 'settings.edit' },
    ],
  },
]

// --- RECHERCHE GLOBALE -----------------------------------------------------

interface Hit { kind: string; label: string; sub: string; to: string }

/** Cherche dans les commandes, clients, produits et transactions. Volontai-
 *  rement simple (sous-chaine insensible a la casse) : a ce volume, un
 *  index serait disproportionne. */
function useGlobalSearch(query: string): Hit[] {
  const d = useData()
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const hits: Hit[] = []

    for (const p of d.products) {
      if (p.name.toLowerCase().includes(q)) {
        hits.push({ kind: 'Boisson', label: p.name, sub: `${p.price} F`, to: 'products' })
      }
    }
    for (const o of d.orders) {
      if (o.reference.toLowerCase().includes(q)
        || o.customerName.toLowerCase().includes(q)
        || o.customerPhone.includes(q)
        || o.customerEmail?.toLowerCase().includes(q)) {
        hits.push({ kind: 'Commande', label: o.reference, sub: o.customerName, to: 'orders' })
      }
    }
    for (const c of d.customers) {
      if (c.name.toLowerCase().includes(q) || c.phone.includes(q)) {
        hits.push({ kind: 'Client', label: c.name, sub: c.phone, to: 'customers' })
      }
    }
    for (const p of d.payments) {
      if (p.transactionId.toLowerCase().includes(q)) {
        hits.push({ kind: 'Transaction', label: p.transactionId, sub: `${p.amount} F`, to: 'payments' })
      }
    }
    return hits.slice(0, 8)
  }, [d, query])
}

// --- PAGE REFUSEE ----------------------------------------------------------

function Forbidden() {
  return (
    <EmptyState
      icon={<Icon name="users" />}
      title="Accès refusé"
      text="Ton rôle ne permet pas de consulter cette page. Demande une extension de permissions à un Super Admin."
    />
  )
}

/** Enveloppe une page d'une verification de permission. */
function Guard({ need, children }: { need?: Permission; children: React.ReactNode }) {
  const perms = useCurrentPermissions()
  if (need && !perms.includes(need)) return <Forbidden />
  return <>{children}</>
}

/** Permissions de l'utilisateur courant. En attendant l'authentification
 *  Supabase, on prend le premier compte actif (le proprietaire). */
export function useCurrentPermissions(): Permission[] {
  const d = useData()
  const me = d.users.find(u => u.id === currentAdminId)
  const role = ROLES.find(r => r.name === me?.role)
  return role?.permissions ?? []
}

// --- COQUILLE --------------------------------------------------------------

export function AdminApp() {
  return <AuthGate><ConnectedAdmin /></AuthGate>
}

function ConnectedAdmin() {
  // Rend le curseur natif au dashboard (le site public le masque).
  useAdminArea()
  const d = useData()
  const perms = useCurrentPermissions()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const [query, setQuery] = useState('')
  const hits = useGlobalSearch(query)
  const me = d.users.find(u => u.id === currentAdminId)

  const pendingOrders = d.orders.filter(o => o.status === 'new' || o.status === 'pending').length

  return (
    <div className="sk-root console">
      <a href="#console-main" className="console-skip">Aller au contenu</a>
      <aside className={'console-sidebar '+(open?'is-open':'')} id="console-navigation">
        {/* Le vrai logo de la marque, pas un placeholder : c'est le meme
            fichier que celui du site public, donc un logo remplace se
            propage aux deux. */}
        <NavLink to="/admin" className="console-brand">
          <img src={snakiLogo} alt="Snaki" />
          <small>ESPACE DE GESTION</small>
        </NavLink>
        <button className="console-close" aria-label="Fermer le menu" onClick={()=>setOpen(false)}><Icon name="close"/></button>
        <nav className="console-navigation" aria-label="Navigation administration">
          {NAV_GROUPS.map(group=>{
            const items=group.items.filter(x=>!x.permission||perms.includes(x.permission))
            return items.length ? <section key={group.title}><h2>{group.title}</h2>{items.map(x=><NavLink end={!x.to} key={x.to} to={'/admin'+(x.to?'/'+x.to:'')} onClick={()=>setOpen(false)}><Icon name={x.icon}/><span>{x.label}</span>{(x.badge?.(d)||0)>0&&<b>{x.badge?.(d)}</b>}</NavLink>)}</section>:null
          })}
        </nav>
        <div className="console-account"><span className="console-avatar">{me?.name?.slice(0,1)||'S'}</span><div><strong>{me?.name}</strong><small>{ROLES.find(r=>r.name===me?.role)?.label}</small></div><Button variant="ghost" disabled={connectionState.saving} onClick={()=>void supabase.auth.signOut()} icon={<Icon name="arrow"/>} aria-label="Se déconnecter"/></div>
      </aside>
      {open&&<button className="console-scrim" aria-label="Fermer la navigation" onClick={()=>setOpen(false)}/>}
      <div className="console-workspace">
        <header className="console-topbar">
          <button className="console-menu" aria-label="Ouvrir le menu" aria-controls="console-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}><Icon name="menu"/></button>
          <div className="console-breadcrumb">Boutique <span>/</span> Administration</div>
          <div className="console-search"><SearchInput value={query} onChange={setQuery} placeholder="Rechercher dans la boutique…"/>
            {query.trim().length>=2&&<div className="console-results">{hits.length?hits.map((h,i)=><button key={i} onClick={()=>{nav('/admin/'+h.to);setQuery('')}}><small>{h.kind}</small><strong>{h.label}</strong><span>{h.sub}</span></button>):<p>Aucun résultat.</p>}</div>}
          </div>
          <Button variant="outline" icon={<Icon name="notifications"/>} aria-label="Notifications" onClick={()=>nav('/admin/notifications')}/>
          <a className="console-site-link" href="/">Voir le site <Icon name="arrow" size={15}/></a>
        </header>
        <main id="console-main" className="console-main">
          {connectionState.saving&&<p role="status" className="console-save-status">Enregistrement en cours…</p>}
          {connectionState.error&&<div role="alert" className="sk-notice sk-notice-warning">La modification n’a pas été confirmée : {connectionState.error}</div>}
          <fieldset disabled={connectionState.saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
          <Routes>
            <Route index element={<Guard need="analytics.view"><OverviewPage /></Guard>} />
            <Route path="orders" element={<Guard need="orders.view"><OrdersPage /></Guard>} />
            <Route path="payments" element={<Guard need="finance.view"><PaymentsPage /></Guard>} />
            <Route path="expenses" element={<Guard need="finance.view"><ExpensesPage /></Guard>} />
            <Route path="customers" element={<Guard need="customers.view"><CustomersPage /></Guard>} />
            <Route path="products" element={<Guard need="products.view"><ProductsPage /></Guard>} />
            <Route path="categories" element={<Guard need="products.view"><CategoriesPage /></Guard>} />
            <Route path="promotions" element={<Guard need="promotions.edit"><PromotionsPage /></Guard>} />
            <Route path="zones" element={<Guard need="settings.edit"><ZonesPage /></Guard>} />
            <Route path="content" element={<Guard need="content.edit"><ContentPage /></Guard>} />
            <Route path="media" element={<Guard need="media.edit"><MediaPage /></Guard>} />
            <Route path="reviews" element={<Guard need="content.edit"><ReviewsPage /></Guard>} />
            <Route path="analytics" element={<Guard need="analytics.view"><AnalyticsPage /></Guard>} />
            <Route path="funnel" element={<Guard need="analytics.view"><FunnelPage /></Guard>} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="users" element={<Guard need="users.manage"><UsersPage /></Guard>} />
            <Route path="settings" element={<Guard need="settings.edit"><SettingsPage /></Guard>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
          </fieldset>
        </main>
        <footer className="console-footer"><span>Snaki · Cotonou, Bénin</span><span>{pendingOrders} commande(s) à traiter</span></footer>
      </div>
    </div>
  )
}

/** Titre de page reutilisable, avec description et actions. */
export function PageHead({ title, subtitle, actions }: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="sk-page-head sk-row sk-row-between sk-row-wrap">
      <div>
        <h1 className="sk-h4">{title}</h1>
        {subtitle && (
          <p className="sk-text-sm sk-muted" style={{ marginTop: 4, maxWidth: '70ch' }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="sk-row">{actions}</div>}
    </header>
  )
}

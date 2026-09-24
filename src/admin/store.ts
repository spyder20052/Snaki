// ===========================================================================
// SNAKI — COUCHE D'ACCES AUX DONNEES
// ===========================================================================
// Un seul point d'entree pour lire et ecrire les donnees du site. Aujourd'hui
// la persistance se fait dans `localStorage` ; demain elle passera par
// Supabase. Les composants n'appellent QUE les fonctions de ce fichier, donc
// la bascule se fera ici seulement, sans toucher aux pages.
//
// Ce qui est deja reel : le catalogue (les 6 boissons du site), les zones de
// livraison, les sections du CMS, les parametres. Ce qui est vide tant que
// rien n'est collecte : commandes, paiements, clients, analytics, avis. Ces
// listes restent VOLONTAIREMENT vides — le dashboard affiche alors un etat
// vide honnete plutot que des chiffres inventes.

import { useEffect, useState } from 'react'
import { loadDatabase, saveDatabase } from './database'
import type {
  AdminNotification, AdminUser, AnalyticsEvent, AnalyticsSession, AuditLog,
  Category, Customer, CustomerSegment, CustomerStats, DeliveryZone, Expense,
  ExpenseCategory, Fulfillment, MediaAsset, Order,
  OrderStatus, Payment, Product, Promotion, Review, Role, SiteSection,
  SiteSettings,
} from './types'

// --- ETAT GLOBAL -----------------------------------------------------------

export interface SnakiData {
  products: Product[]
  categories: Category[]
  orders: Order[]
  payments: Payment[]
  customers: Customer[]
  promotions: Promotion[]
  expenses: Expense[]
  zones: DeliveryZone[]
  reviews: Review[]
  media: MediaAsset[]
  sections: SiteSection[]
  events: AnalyticsEvent[]
  sessions: AnalyticsSession[]
  users: AdminUser[]
  logs: AuditLog[]
  notifications: AdminNotification[]
  settings: SiteSettings
}

const STORAGE_KEY = 'snaki.admin.v1'

// --- DONNEES INITIALES -----------------------------------------------------
// Extraites du site public existant : ce sont les VRAIES boissons et zones
// affichees aujourd'hui, pas des exemples.

const nowIso = () => new Date().toISOString()

/** Genere un identifiant. `crypto.randomUUID` quand il est disponible, sinon
 *  un repli suffisant pour un usage local. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const slugify = (s: string): string =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Groupes de variantes communs a toutes les boissons. Recrees pour chaque
 *  produit (identifiants distincts) afin qu'une modification sur l'un
 *  n'affecte pas les autres. */
const defaultVariantGroups = () => [
  {
    id: newId(), name: 'Taille', type: 'single' as const, required: true,
    options: [
      { id: newId(), label: 'Moyen', priceDelta: 0, available: true, isDefault: true },
      { id: newId(), label: 'Grand', priceDelta: 500, available: true },
    ],
  },
  {
    id: newId(), name: 'Sucre', type: 'single' as const, required: true,
    options: [
      { id: newId(), label: '0 %', priceDelta: 0, available: true },
      { id: newId(), label: '50 %', priceDelta: 0, available: true, isDefault: true },
      { id: newId(), label: '100 %', priceDelta: 0, available: true },
    ],
  },
  {
    id: newId(), name: 'Glace', type: 'single' as const, required: true,
    options: [
      { id: newId(), label: 'Sans glace', priceDelta: 0, available: true },
      { id: newId(), label: 'Peu de glace', priceDelta: 0, available: true, isDefault: true },
      { id: newId(), label: 'Normal', priceDelta: 0, available: true },
    ],
  },
  {
    id: newId(), name: 'Toppings', type: 'multi' as const, required: false,
    options: [
      { id: newId(), label: 'Perles de tapioca', priceDelta: 300, available: true },
      { id: newId(), label: 'Perles popping', priceDelta: 300, available: true },
      { id: newId(), label: 'Chantilly', priceDelta: 200, available: true },
      { id: newId(), label: 'Gelee de coco', priceDelta: 300, available: true },
    ],
  },
]

const seedCategories = (): Category[] => [
  { id: 'cat-bubble', name: 'Bubble tea', slug: 'bubble-tea', position: 1, visible: true, archived: false },
  { id: 'cat-milk', name: 'Milk tea', slug: 'milk-tea', position: 2, visible: true, archived: false },
  { id: 'cat-fruit', name: 'Thé fruité', slug: 'the-fruite', position: 3, visible: true, archived: false },
  { id: 'cat-smoothie', name: 'Smoothies', slug: 'smoothies', position: 4, visible: true, archived: false },
  { id: 'cat-special', name: 'Specials', slug: 'specials', position: 5, visible: true, archived: false },
]

/** Les 6 boissons reellement presentes sur /bobas, converties au modele
 *  complet. Les prix sont ceux du site (en FCFA, sans espace insecable). */
const seedProducts = (): Product[] => {
  const base = [
    { name: 'Classique Perles', price: 2500, cat: 'cat-bubble', tea: 'Thé noir', top: 'Perles', profile: 'Doux', kcal: 210, prep: '3–4 min', popular: true },
    { name: 'Fraise Givrée', price: 3000, cat: 'cat-fruit', tea: 'Thé noir', top: 'Fraise', profile: 'Frais', kcal: 240, prep: '3–5 min', popular: false },
    { name: 'Bleu Lagon', price: 3200, cat: 'cat-fruit', tea: 'Thé bleu', top: 'Citron vert', profile: 'Vif', kcal: 190, prep: '4–5 min', popular: false },
    { name: 'Matcha Nuage', price: 3500, cat: 'cat-special', tea: 'Matcha', top: 'Chantilly', profile: 'Doux', kcal: 260, prep: '4 min', popular: true },
    { name: 'Raisin Perlé', price: 3400, cat: 'cat-milk', tea: 'Thé au lait', top: 'Perles', profile: 'Gourmand', kcal: 300, prep: '4–6 min', popular: true },
    { name: 'Mangue Soleil', price: 3100, cat: 'cat-fruit', tea: 'Thé blanc', top: 'Mangue', profile: 'Fruité', kcal: 230, prep: '3–4 min', popular: false },
  ]
  return base.map((p, i) => ({
    id: `prod-${slugify(p.name)}`,
    name: p.name,
    slug: slugify(p.name),
    shortDescription: `${p.tea} · ${p.top} · ${p.profile}`,
    description: '',
    price: p.price,
    categoryId: p.cat,
    collectionIds: [],
    gallery: [],
    status: 'active' as const,
    stock: null,
    available: true,
    position: i + 1,
    tags: [p.profile],
    allergens: [],
    ingredients: [p.tea, p.top],
    nutrition: { kcal: p.kcal },
    prepTime: p.prep,
    isNew: false,
    isPopular: p.popular,
    isFeatured: i === 0,
    variantGroups: defaultVariantGroups(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
}

/** Les 5 zones affichees sur la carte du site public. */
const seedZones = (): DeliveryZone[] => [
  { id: 'zone-cotonou', name: 'Cotonou', available: true, fee: 500, minOrder: 2000, eta: '20–35 min', priority: 1 },
  { id: 'zone-fidjrosse', name: 'Fidjrossè', available: true, fee: 500, minOrder: 2000, eta: '25–40 min', priority: 2 },
  { id: 'zone-godomey', name: 'Godomey', available: true, fee: 1000, minOrder: 3000, eta: '30–45 min', priority: 3 },
  { id: 'zone-calavi', name: 'Calavi', available: true, fee: 1000, minOrder: 3000, eta: '35–50 min', priority: 4 },
  { id: 'zone-hevie', name: 'Hêvié', available: true, fee: 1500, minOrder: 3500, eta: '40–60 min', priority: 5 },
]

/** Sections du site public, dans leur ordre d'apparition reel. Les textes
 *  sont ceux actuellement affiches : modifier un champ ici doit changer le
 *  site (branchement fait a l'etape suivante). */
const seedSections = (): SiteSection[] => [
  {
    id: 'sec-hero', name: 'Hero', page: 'home', visible: true, position: 1, locked: true,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', value: 'SNAKI' },
      { key: 'subtitle', label: 'Sous-titre', kind: 'textarea', value: '' },
      { key: 'cta', label: 'Bouton', kind: 'text', value: 'Commander' },
    ],
  },
  {
    id: 'sec-about', name: 'À propos', page: 'home', visible: true, position: 2,
    fields: [{ key: 'intro', label: 'Introduction', kind: 'textarea', value: '' }],
  },
  {
    id: 'sec-experience', name: 'Expérience', page: 'home', visible: true, position: 3,
    fields: [{ key: 'title', label: 'Titre', kind: 'text', value: 'DRINK GOOD FEEL GOOD' }],
  },
  {
    id: 'sec-drinkband', name: 'Bandeau boissons', page: 'home', visible: true, position: 4,
    fields: [],
  },
  {
    id: 'sec-travel', name: 'Take Away / Zones', page: 'home', visible: true, position: 5,
    fields: [
      { key: 'eyebrow', label: 'Sur-titre', kind: 'text', value: 'TAKE AWAY' },
      { key: 'title', label: 'Titre', kind: 'text', value: 'UN BOBA QUI VOYAGE AVEC TOI' },
    ],
  },
  {
    id: 'sec-photo', name: 'Photo « Snaki, c’est vous »', page: 'home', visible: true, position: 6,
    fields: [
      { key: 'claim', label: 'Accroche', kind: 'text', value: 'Snaki, c’est vous' },
      { key: 'image', label: 'Photo (desktop)', kind: 'image', value: 'now.PNG' },
      { key: 'imageMobile', label: 'Photo (mobile)', kind: 'image', value: 'nowi.PNG' },
    ],
  },
  {
    id: 'sec-footer', name: 'Footer « On sirote Snaki »', page: 'global', visible: true, position: 7, locked: true,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text', value: 'SIROTE SNAKI' },
      { key: 'cta', label: 'Bouton', kind: 'text', value: 'ON COMMANDE' },
    ],
  },
]

const seedSettings = (): SiteSettings => ({
  brandName: 'Snaki',
  whatsapp: '',
  phone: '',
  email: 'contactsnaki@gmail.com',
  instagram: 'https://instagram.com',
  tiktok: 'https://tiktok.com',
  address: 'Cotonou, Bénin',
  currency: 'FCFA',
  defaultDeliveryFee: 500,
  minOrder: 2000,
  acceptingOrders: true,
  ordersClosedMessage: 'Nous ne prenons pas de commandes pour le moment. À très vite !',
  openingHours: [
    { day: 1, open: '10:00', close: '22:00', closed: false },
    { day: 2, open: '10:00', close: '22:00', closed: false },
    { day: 3, open: '10:00', close: '22:00', closed: false },
    { day: 4, open: '10:00', close: '22:00', closed: false },
    { day: 5, open: '10:00', close: '23:00', closed: false },
    { day: 6, open: '10:00', close: '23:00', closed: false },
    { day: 0, open: '14:00', close: '22:00', closed: false },
  ],
  closures: [],
  seo: {
    title: 'Snaki — Bubble tea à Cotonou',
    description: 'Bubble tea frais préparé à la commande. Livraison à Cotonou, Fidjrossè, Godomey, Calavi et Hêvié.',
    noindex: false,
  },
})

export const ROLES: Role[] = [
  {
    name: 'super_admin', label: 'Super Admin',
    permissions: [
      'orders.view', 'orders.edit', 'orders.refund', 'products.view', 'products.edit',
      'content.edit', 'media.edit', 'customers.view', 'finance.view',
      'promotions.edit', 'analytics.view', 'settings.edit', 'users.manage',
    ],
  },
  {
    name: 'manager', label: 'Manager',
    permissions: [
      'orders.view', 'orders.edit', 'orders.refund', 'products.view', 'products.edit',
      'content.edit', 'media.edit', 'customers.view', 'finance.view',
      'promotions.edit', 'analytics.view',
    ],
  },
  {
    name: 'orders_staff', label: 'Employé commandes',
    permissions: ['orders.view', 'orders.edit', 'products.view', 'customers.view'],
  },
  {
    name: 'content_editor', label: 'Éditeur contenu',
    permissions: ['content.edit', 'media.edit', 'products.view', 'products.edit'],
  },
]

const seedUsers = (): AdminUser[] => [
  {
    id: 'user-owner', name: 'Administrateur', email: 'spynel@devpanl.dev',
    role: 'super_admin', active: true, createdAt: nowIso(),
  },
]

/** Etat de depart. Les collections liees a l'activite reelle (commandes,
 *  paiements, clients, analytics, avis) sont vides par choix : elles se
 *  rempliront quand le site commencera a enregistrer. */
const initialData = (): SnakiData => ({
  products: seedProducts(),
  categories: seedCategories(),
  orders: [],
  payments: [],
  customers: [],
  promotions: [],
  expenses: [],
  zones: seedZones(),
  reviews: [],
  media: [],
  sections: seedSections(),
  events: [],
  sessions: [],
  users: seedUsers(),
  logs: [],
  notifications: [],
  settings: seedSettings(),
})

// --- PERSISTANCE -----------------------------------------------------------
// `localStorage` en attendant Supabase. Toute lecture est protegee : un
// navigateur en navigation privee peut lever une exception.

let data: SnakiData = load()
let remote = false
let sessionVersion = 0
let pendingWrite: Promise<void> = Promise.resolve()
export let currentAdminId: string | null = null
export const connectionState = { loading: false, saving: false, error: '' }
export async function connectAdmin(id: string) {
  const version = ++sessionVersion
  connectionState.loading = true
  connectionState.error = ''
  try {
    const loaded = await loadDatabase()
    if (version !== sessionVersion) throw new Error('La session a changé. Reconnectez-vous.')
    const me = loaded.users.find(u => u.id === id && u.active)
    if (!me) throw new Error('Ce compte ne possède pas de profil administrateur actif. Ajoutez son identifiant dans admin_users.')
    data = loaded
    currentAdminId = id
    remote = true
  } finally {
    connectionState.loading = false
    for (const fn of listeners) fn()
  }
}
export function disconnectAdmin() {
  sessionVersion++
  remote = false
  currentAdminId = null
  data = initialData()
  for (const fn of listeners) fn()
}

function load(): SnakiData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialData()
    const parsed = JSON.parse(raw) as Partial<SnakiData>
    // Fusion avec l'etat initial : si une nouvelle collection apparait dans
    // une version ulterieure, elle ne sera pas `undefined` a la lecture.
    return { ...initialData(), ...parsed }
  } catch {
    return initialData()
  }
}

function persist() {
  if (remote) {
    for (const fn of listeners) fn()
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Quota depasse ou stockage interdit : on garde l'etat en memoire.
  }
  for (const fn of listeners) fn()
}

// --- ABONNEMENT ------------------------------------------------------------
// Les composants s'abonnent via `useData`. Toute ecriture notifie tout le
// monde, donc l'interface reste coherente sans avoir a remonter des props.

const listeners = new Set<() => void>()

export function useData(): SnakiData {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force(n => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return data
}

/** Lecture directe, hors composant React. */
export const getData = (): SnakiData => data

/** Applique une modification et notifie les abonnes. */
export function update(fn: (d: SnakiData) => void) {
  if (remote) {
    const before = structuredClone(data)
    const version = sessionVersion
    const after = structuredClone(data)
    fn(after)
    data = after
    connectionState.saving = true
    connectionState.error = ''
    for (const listener of listeners) listener()
    const previous = pendingWrite
    const operation = previous.then(() => saveDatabase(before, after))
    pendingWrite = operation
    return operation.then(async () => {
      if (pendingWrite === operation) {
        // Le verrou est libere des que l'ecriture est acceptee. La relecture
        // des 29 tables sert seulement a recuperer ce que la base a calcule
        // (references, horodatages, declencheurs) : elle peut se faire en
        // arriere-plan, sans immobiliser l'interface entre deux actions.
        connectionState.saving = false
        void loadDatabase().then(loaded => {
          if (version === sessionVersion && pendingWrite === operation) {
            data = loaded
            for (const listener of listeners) listener()
          }
        }).catch(() => {
          // Une relecture ratee n'invalide pas l'ecriture : l'etat affiche
          // reste celui qu'on vient d'enregistrer.
        })
      }
      return true
    }).catch(async (error: unknown) => {
      if (version !== sessionVersion) return false
      if (pendingWrite === operation) {
        try {
          const loaded = await loadDatabase()
          if (version === sessionVersion) data = loaded
        } catch { data = before }
      }
      connectionState.error = error instanceof Error ? error.message : 'Échec de la sauvegarde.'
      return false
    }).finally(() => {
      if (pendingWrite === operation) {
        connectionState.saving = false
        pendingWrite = Promise.resolve()
      }
      for (const listener of listeners) listener()
    })
  }
  fn(data)
  persist()
}

/** Remet tout a l'etat initial (bouton de reinitialisation des parametres). */
export function resetAll() {
  if (remote) throw new Error('La réinitialisation est désactivée pour la base de production.')
  data = initialData()
  persist()
}

// --- JOURNAL D'ACTIVITE ----------------------------------------------------

export function log(
  message: string,
  entity: string,
  action: AuditLog['action'],
  entityId?: string,
  actor = 'Administrateur',
) {
  if (remote) return
  data.logs.unshift({
    id: newId(), message, actor, entity, entityId, action, at: nowIso(),
  })
  // Le journal est borne : au-dela, les entrees les plus anciennes tombent.
  if (data.logs.length > 500) data.logs.length = 500
}

// --- CATALOGUE : ECRITURES -------------------------------------------------

export function createProduct(partial: Partial<Product> = {}): Product {
  const name = partial.name?.trim() || 'Nouvelle boisson'
  const product: Product = {
    id: newId(),
    name,
    slug: partial.slug || slugify(name),
    price: partial.price ?? 0,
    collectionIds: [],
    gallery: [],
    status: 'hidden', // une nouvelle boisson n'est jamais publiee d'emblee
    stock: null,
    available: true,
    position: data.products.length + 1,
    tags: [],
    allergens: [],
    ingredients: [],
    isNew: true,
    isPopular: false,
    isFeatured: false,
    variantGroups: defaultVariantGroups(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...partial,
  }
  update(d => {
    d.products.push(product)
    log(`Boisson « ${product.name} » créée`, 'product', 'create', product.id)
  })
  return product
}

export function saveProduct(id: string, patch: Partial<Product>) {
  update(d => {
    const p = d.products.find(x => x.id === id)
    if (!p) return
    // Journalise le changement de prix explicitement : c'est l'information
    // la plus sensible du catalogue.
    if (patch.price !== undefined && patch.price !== p.price) {
      log(
        `Prix de « ${p.name} » modifié de ${p.price} F à ${patch.price} F`,
        'product', 'update', id,
      )
    } else {
      log(`Boisson « ${p.name} » modifiée`, 'product', 'update', id)
    }
    Object.assign(p, patch, { updatedAt: nowIso() })
  })
}

export function duplicateProduct(id: string) {
  const src = data.products.find(p => p.id === id)
  if (!src) return
  const copy: Product = {
    ...structuredClone(src),
    id: newId(),
    name: `${src.name} (copie)`,
    slug: `${src.slug}-copie`,
    status: 'hidden',
    isFeatured: false,
    position: data.products.length + 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    variantGroups: src.variantGroups.map(g => ({...g,id:newId(),options:g.options.map(o=>({...o,id:newId()}))})),
  }
  update(d => {
    d.products.push(copy)
    log(`Boisson « ${src.name} » dupliquée`, 'product', 'create', copy.id)
  })
}

/** Archive plutot que supprimer : les commandes passees referencent le
 *  produit, et les statistiques doivent rester justes. */
export function archiveProduct(id: string) {
  update(d => {
    const p = d.products.find(x => x.id === id)
    if (!p) return
    p.status = 'archived'
    p.available = false
    p.updatedAt = nowIso()
    log(`Boisson « ${p.name} » archivée`, 'product', 'archive', id)
  })
}

export function deleteProduct(id: string) {
  update(d => {
    const p = d.products.find(x => x.id === id)
    if (!p) return
    d.products = d.products.filter(x => x.id !== id)
    log(`Boisson « ${p.name} » supprimée`, 'product', 'delete', id)
  })
}

/** Reordonne apres un glisser-deposer : `ids` est le nouvel ordre complet. */
export function reorderProducts(ids: string[]) {
  update(d => {
    ids.forEach((id, i) => {
      const p = d.products.find(x => x.id === id)
      if (p) p.position = i + 1
    })
    log('Ordre des boissons modifié', 'product', 'update')
  })
}

export function createCategory(name: string): Category {
  const cat: Category = {
    id: newId(), name, slug: slugify(name),
    position: data.categories.length + 1, visible: true, archived: false,
  }
  update(d => {
    d.categories.push(cat)
    log(`Catégorie « ${name} » créée`, 'category', 'create', cat.id)
  })
  return cat
}

export function saveCategory(id: string, patch: Partial<Category>) {
  update(d => {
    const c = d.categories.find(x => x.id === id)
    if (!c) return
    Object.assign(c, patch)
    log(`Catégorie « ${c.name} » modifiée`, 'category', 'update', id)
  })
}

export function deleteCategory(id: string) {
  update(d => {
    const c = d.categories.find(x => x.id === id)
    if (!c) return
    d.categories = d.categories.filter(x => x.id !== id)
    // Les produits de la categorie ne sont pas supprimes : ils deviennent
    // simplement sans categorie.
    for (const p of d.products) if (p.categoryId === id) p.categoryId = undefined
    log(`Catégorie « ${c.name} » supprimée`, 'category', 'delete', id)
  })
}

export function reorderCategories(ids: string[]) {
  update(d => {
    ids.forEach((id, i) => {
      const c = d.categories.find(x => x.id === id)
      if (c) c.position = i + 1
    })
    log('Ordre des catégories modifié', 'category', 'update')
  })
}

// --- COMMANDES -------------------------------------------------------------

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nouvelle', pending: 'En attente', confirmed: 'Confirmée',
  preparing: 'En préparation', ready: 'Prête', delivering: 'En livraison',
  delivered: 'Livrée', picked_up: 'Récupérée', completed: 'Terminée',
  cancelled: 'Annulée', refunded: 'Remboursée',
}

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = {
  delivery: 'Livraison', pickup: 'Retrait sur place',
}

/** Enchainement d'une commande LIVREE : un livreur l'apporte au client. */
const FLOW_DELIVERY: OrderStatus[] = [
  'new', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'completed',
]

/** Enchainement d'une commande A RETIRER sur place. Elle ne part jamais en
 *  livraison : une fois prete, le client vient la chercher, et la commande
 *  passe directement a « Récupérée ». Afficher « En livraison » sur une
 *  commande a emporter n'aurait aucun sens au comptoir. */
const FLOW_PICKUP: OrderStatus[] = [
  'new', 'confirmed', 'preparing', 'ready', 'picked_up',
]

/** Parcours suivi par une commande, selon son mode de remise.
 *
 *  Les commandes enregistrees avant l'ajout du retrait n'ont pas de
 *  `fulfillment` : elles sont traitees comme des livraisons, ce qui
 *  correspond a ce qu'elles etaient. */
export function orderFlow(fulfillment?: Fulfillment): OrderStatus[] {
  return fulfillment === 'pickup' ? FLOW_PICKUP : FLOW_DELIVERY
}

/** Conserve pour les usages qui n'ont pas de commande sous la main (filtres,
 *  listes de reference). Pour une commande precise, preferer `orderFlow`. */
export const ORDER_FLOW = FLOW_DELIVERY

/** Statut suivant dans le parcours, ou `null` si la commande est arrivee au
 *  bout (ou dans un etat terminal comme annulee / remboursee). */
export function nextOrderStatus(
  current: OrderStatus, fulfillment?: Fulfillment,
): OrderStatus | null {
  const flow = orderFlow(fulfillment)
  // `pending` n'est pas dans le flux principal : il precede la confirmation.
  if (current === 'pending') return 'confirmed'
  const i = flow.indexOf(current)
  if (i < 0 || i >= flow.length - 1) return null
  return flow[i + 1]
}

/** Etats qui declenchent une notification au client : les etapes cles
 *  seulement. `ready` et `completed` sont volontairement exclus — ils
 *  n'apportent rien au client et multiplier les messages finit par lasser. */
export const NOTIFY_STATUSES: OrderStatus[] = [
  'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled',
]

/** `ready` ne concerne que les commandes A RETIRER : le client doit savoir
 *  quand venir. Sur une livraison, la commande prete part aussitot et c'est
 *  « En livraison » qui l'informe — le prevenir deux fois de suite n'apporte
 *  rien. */
export function notifiesCustomer(status: OrderStatus, fulfillment?: Fulfillment): boolean {
  if (status === 'ready') return fulfillment === 'pickup'
  return NOTIFY_STATUSES.includes(status)
}

/** Message envoye au client pour chaque etape cle. Redige a la deuxieme
 *  personne du pluriel et signe, pour que le client identifie l'expediteur. */
export function customerMessage(o: Order, status: OrderStatus): string {
  const ref = o.reference
  const name = o.customerName.split(' ')[0]
  switch (status) {
    case 'confirmed':
      return `Bonjour ${name}, votre commande ${ref} est confirmée. Nous la préparons très vite. Snaki`
    case 'preparing':
      return `${name}, votre commande ${ref} est en préparation. Encore un peu de patience. Snaki`
    case 'ready':
      // Message de retrait : le client doit savoir qu'il peut venir.
      return `${name}, votre commande ${ref} est prête. Vous pouvez venir la récupérer. Snaki`
    case 'delivering':
      return `${name}, votre commande ${ref} est en route. Notre livreur arrive. Snaki`
    case 'delivered':
      return `Votre commande ${ref} a été livrée. Merci et à bientôt chez Snaki.`
    case 'picked_up':
      return `Merci ${name}, votre commande ${ref} a bien été récupérée. À bientôt chez Snaki.`
    case 'cancelled':
      return `${name}, votre commande ${ref} a été annulée.${o.cancelReason ? ` Motif : ${o.cancelReason}.` : ''} Contactez-nous si besoin. Snaki`
    default:
      return `Votre commande ${ref} : ${ORDER_STATUS_LABELS[status]}. Snaki`
  }
}

/** Couleur de badge par statut, pour que la lecture soit homogene partout. */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  new: 'brand', pending: 'warning', confirmed: 'info', preparing: 'info',
  ready: 'info', delivering: 'info', delivered: 'success',
  picked_up: 'success', completed: 'success', cancelled: 'danger',
  refunded: 'neutral',
}

export async function setOrderStatus(id: string, status: OrderStatus, reason?: string) {
  // Aucun verrou sur `connectionState.saving` ici : les ecritures sont deja
  // mises a la file par `pendingWrite` dans `update()`. Refuser le clic
  // pendant une sauvegarde obligeait l'equipe a attendre entre deux etats,
  // alors que la file les enchaine tres bien.
  if (!data.orders.some(o => o.id === id)) throw new Error('Cette commande est introuvable.')
  if (['cancelled', 'refunded'].includes(status) && !reason?.trim()) throw new Error('Renseignez un motif avant de continuer.')
  const saved = await update(d => {
    const o = d.orders.find(x => x.id === id)
    if (!o) return
    o.status = status
    o.updatedAt = nowIso()
    o.statusHistory.push({ status, at: nowIso(), by: 'Administrateur', reason })
    if (status === 'cancelled') {
      o.cancelReason = reason
      o.cancelledAt = nowIso()
      // `cancelledBy` n'est PAS renseigne ici : la colonne SQL est un uuid
      // referencant `admin_users`, pas un texte. C'est le declencheur
      // `log_order_status` qui inscrit l'auteur reel (`auth.uid()`) dans
      // l'historique — plus fiable, et impossible a falsifier depuis le
      // navigateur.
    }
    log(
      `Commande ${o.reference} → ${ORDER_STATUS_LABELS[status]}`,
      'order', 'status', id,
    )
  })
  if (saved === false) throw new Error(connectionState.error || 'Le statut n’a pas pu être enregistré.')
}

// --- CLIENTS : STATISTIQUES DERIVEES ---------------------------------------

/** Recalcule les statistiques d'un client depuis ses commandes. Rien n'est
 *  stocke : impossible d'avoir un compteur qui derive de la realite. */
export function customerStats(customerId: string): CustomerStats {
  const orders = data.orders.filter(o => o.customerId === customerId)
  const valid = orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
  const totalSpent = valid.reduce((s, o) => s + o.total, 0)

  // Produits favoris : cumul des quantites par nom de produit.
  const byProduct = new Map<string, number>()
  for (const o of valid) {
    for (const it of o.items) {
      byProduct.set(it.productName, (byProduct.get(it.productName) ?? 0) + it.qty)
    }
  }
  const favoriteProducts = [...byProduct.entries()]
    .map(([productName, qty]) => ({ productName, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3)

  const dates = valid.map(o => o.createdAt).sort()
  const orderCount = valid.length

  // Segmentation : seuils volontairement simples et lisibles.
  let segment: CustomerSegment = 'new'
  const lastOrder = dates.at(-1)
  const daysSince = lastOrder
    ? (Date.now() - new Date(lastOrder).getTime()) / 86_400_000
    : Infinity
  if (orderCount === 0) segment = 'new'
  else if (daysSince > 60) segment = 'inactive'
  else if (totalSpent >= 50_000) segment = 'big_spender'
  else if (orderCount >= 10) segment = 'loyal'
  else if (orderCount >= 3) segment = 'regular'

  return {
    orderCount,
    cancelledCount: orders.filter(o => o.status === 'cancelled').length,
    totalSpent,
    averageOrder: orderCount ? Math.round(totalSpent / orderCount) : 0,
    firstOrderAt: dates[0],
    lastOrderAt: lastOrder,
    favoriteProducts,
    segment,
  }
}

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  new: 'Nouveau', regular: 'Régulier', loyal: 'Fidèle',
  big_spender: 'Gros acheteur', inactive: 'Inactif',
}

// --- CMS -------------------------------------------------------------------

export function toggleSection(id: string) {
  update(d => {
    const s = d.sections.find(x => x.id === id)
    if (!s || s.locked) return
    s.visible = !s.visible
    log(
      `Section « ${s.name} » ${s.visible ? 'affichée' : 'masquée'}`,
      'section', 'update', id,
    )
  })
}

export function saveSectionField(sectionId: string, key: string, value: string) {
  update(d => {
    const s = d.sections.find(x => x.id === sectionId)
    const f = s?.fields.find(x => x.key === key)
    if (!s || !f) return
    f.value = value
    log(`Section « ${s.name} » : champ « ${f.label} » modifié`, 'section', 'update', sectionId)
  })
}

export function reorderSections(ids: string[]) {
  update(d => {
    ids.forEach((id, i) => {
      const s = d.sections.find(x => x.id === id)
      if (s) s.position = i + 1
    })
    log('Ordre des sections modifié', 'section', 'update')
  })
}

// --- PROMOTIONS, ZONES, PARAMETRES ----------------------------------------

export function createPromotion(partial: Partial<Promotion> = {}): Promotion {
  const promo: Promotion = {
    id: newId(),
    code: (partial.code || 'PROMO').toUpperCase(),
    kind: partial.kind ?? 'percent',
    value: partial.value ?? 10,
    usedCount: 0,
    productIds: [],
    oncePerCustomer: true,
    active: false,
    createdAt: nowIso(),
    ...partial,
  }
  update(d => {
    d.promotions.push(promo)
    log(`Promotion « ${promo.code} » créée`, 'promotion', 'create', promo.id)
  })
  return promo
}

export function savePromotion(id: string, patch: Partial<Promotion>) {
  update(d => {
    const p = d.promotions.find(x => x.id === id)
    if (!p) return
    Object.assign(p, patch)
    log(`Promotion « ${p.code} » modifiée`, 'promotion', 'update', id)
  })
}

export function deletePromotion(id: string) {
  update(d => {
    const p = d.promotions.find(x => x.id === id)
    if (!p) return
    d.promotions = d.promotions.filter(x => x.id !== id)
    log(`Promotion « ${p.code} » supprimée`, 'promotion', 'delete', id)
  })
}

// --- DEPENSES --------------------------------------------------------------

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  ingredients: 'Ingrédients',
  condiments: 'Condiments & gobelets',
  packaging: 'Emballage',
  equipment: 'Matériel',
  delivery: 'Livraison',
  rent: 'Loyer & charges',
  salary: 'Salaires',
  marketing: 'Marketing',
  other: 'Autre',
}

export function createExpense(partial: Partial<Expense> = {}): Expense {
  const expense: Expense = {
    id: newId(),
    label: partial.label?.trim() || 'Dépense',
    category: partial.category ?? 'condiments',
    amount: partial.amount ?? 0,
    // Par defaut la date du jour : on saisit le plus souvent le jour meme.
    spentAt: partial.spentAt ?? nowIso(),
    createdAt: nowIso(),
    ...partial,
  }
  update(d => {
    d.expenses.unshift(expense)
    log(`Dépense « ${expense.label} » — ${expense.amount} F`, 'expense', 'create', expense.id)
  })
  return expense
}

export function saveExpense(id: string, patch: Partial<Expense>) {
  update(d => {
    const e = d.expenses.find(x => x.id === id)
    if (!e) return
    Object.assign(e, patch)
    log(`Dépense « ${e.label} » modifiée`, 'expense', 'update', id)
  })
}

export function deleteExpense(id: string) {
  update(d => {
    const e = d.expenses.find(x => x.id === id)
    if (!e) return
    d.expenses = d.expenses.filter(x => x.id !== id)
    log(`Dépense « ${e.label} » supprimée`, 'expense', 'delete', id)
  })
}

/** Resultat sur une periode : ce qui entre, ce qui sort, ce qui reste.
 *
 *  Le chiffre d'affaires exclut les commandes annulees et remboursees —
 *  compter de l'argent jamais encaisse fausserait le benefice. */
export function profitOverPeriod(from: Date, to: Date) {
  const within = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= +from && t <= +to
  }
  const revenue = data.orders
    .filter(o => within(o.createdAt) && o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((s, o) => s + o.total, 0)
  const expenses = data.expenses
    .filter(e => within(e.spentAt))
    .reduce((s, e) => s + e.amount, 0)

  // Repartition par categorie, pour savoir OU part l'argent.
  const byCategory = new Map<ExpenseCategory, number>()
  for (const e of data.expenses.filter(x => within(x.spentAt))) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount)
  }

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    // Marge en pourcentage du chiffre d'affaires. `null` quand il n'y a
    // aucune vente : afficher « 0 % » laisserait croire a une perte totale.
    margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : null,
    byCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}

/** Modifie la fiche d'un client depuis le dashboard.
 *
 *  Les statistiques (nombre de commandes, total depense, segment) ne sont
 *  PAS modifiables : elles sont recalculees depuis les commandes reelles.
 *  Seules les coordonnees et les notes internes le sont. */
export function saveCustomer(id: string, patch: Partial<Customer>) {
  update(d => {
    const c = d.customers.find(x => x.id === id)
    if (!c) return
    // Le telephone identifie le client et relie ses commandes : on
    // journalise son changement a part, c'est l'information la plus
    // sensible de la fiche.
    if (patch.phone && patch.phone !== c.phone) {
      log(`Téléphone de « ${c.name} » modifié : ${c.phone} → ${patch.phone}`,
          'customer', 'update', id)
    } else {
      log(`Client « ${c.name} » modifié`, 'customer', 'update', id)
    }
    Object.assign(c, patch)
  })
}

export function saveZone(id: string, patch: Partial<DeliveryZone>) {
  update(d => {
    const z = d.zones.find(x => x.id === id)
    if (!z) return
    Object.assign(z, patch)
    log(`Zone « ${z.name} » modifiée`, 'zone', 'update', id)
  })
}

export function createZone(name: string): DeliveryZone {
  const zone: DeliveryZone = {
    id: newId(), name, available: true,
    fee: data.settings.defaultDeliveryFee, minOrder: data.settings.minOrder,
    priority: data.zones.length + 1,
  }
  update(d => {
    d.zones.push(zone)
    log(`Zone « ${name} » créée`, 'zone', 'create', zone.id)
  })
  return zone
}

export function deleteZone(id: string) {
  update(d => {
    const z = d.zones.find(x => x.id === id)
    if (!z) return
    d.zones = d.zones.filter(x => x.id !== id)
    log(`Zone « ${z.name} » supprimée`, 'zone', 'delete', id)
  })
}

export function saveSettings(patch: Partial<SiteSettings>) {
  update(d => {
    // L'interrupteur global de commandes est journalise a part : c'est
    // l'action la plus visible cote client.
    if (patch.acceptingOrders !== undefined
        && patch.acceptingOrders !== d.settings.acceptingOrders) {
      log(
        `Commandes ${patch.acceptingOrders ? 'réactivées' : 'suspendues'}`,
        'settings', 'update',
      )
    } else {
      log('Paramètres modifiés', 'settings', 'update')
    }
    Object.assign(d.settings, patch)
  })
}

export function addClosure(from: string, to: string, reason: string) {
  update(d => {
    d.settings.closures.push({ id: newId(), from, to, reason })
    log(`Fermeture exceptionnelle ajoutée : ${reason}`, 'settings', 'update')
  })
}

export function removeClosure(id: string) {
  update(d => {
    d.settings.closures = d.settings.closures.filter(c => c.id !== id)
    log('Fermeture exceptionnelle supprimée', 'settings', 'update')
  })
}

// --- AVIS ------------------------------------------------------------------

export function setReviewStatus(id: string, status: Review['status']) {
  update(d => {
    const r = d.reviews.find(x => x.id === id)
    if (!r) return
    r.status = status
    log(`Avis de ${r.customerName} → ${status}`, 'review', 'update', id)
  })
}

export function replyToReview(id: string, reply: string) {
  update(d => {
    const r = d.reviews.find(x => x.id === id)
    if (!r) return
    r.reply = reply
    log(`Réponse à l'avis de ${r.customerName}`, 'review', 'update', id)
  })
}

// --- MEDIATHEQUE -----------------------------------------------------------

export function addMedia(asset: Omit<MediaAsset, 'id' | 'createdAt'>): MediaAsset {
  const m: MediaAsset = { ...asset, id: newId(), createdAt: nowIso() }
  update(d => {
    d.media.push(m)
    log(`Média « ${m.name} » importé`, 'media', 'create', m.id)
  })
  return m
}

export function deleteMedia(id: string) {
  update(d => {
    const m = d.media.find(x => x.id === id)
    if (!m) return
    d.media = d.media.filter(x => x.id !== id)
    log(`Média « ${m.name} » supprimé`, 'media', 'delete', id)
  })
}

// --- NOTIFICATIONS ---------------------------------------------------------

export function markNotificationsRead() {
  update(d => { for (const n of d.notifications) n.read = true })
}

// --- FORMATAGE -------------------------------------------------------------

/** Montant en FCFA. `fr-FR` place l'espace comme separateur de milliers, ce
 *  qui correspond a l'affichage du site public (« 2 500 F »). */
export const formatAmount = (n: number): string =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} F`

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('fr-FR').format(n)

/** Pourcentage avec une decimale, ou `—` si le denominateur est nul (eviter
 *  d'afficher « NaN % » ou « 0 % » quand il n'y a simplement pas de donnee). */
export const formatRate = (num: number, den: number): string =>
  den > 0 ? `${((num / den) * 100).toFixed(1)} %` : '—'

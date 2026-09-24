// ===========================================================================
// SNAKI — MODELE DE DONNEES
// ===========================================================================
// Ces types decrivent le schema de la base (voir schema.sql). Ils servent de
// contrat unique entre le dashboard, le site public et le futur backend
// Supabase : quand on branchera Supabase, ce sont ces memes formes qui
// remonteront de la base, donc aucun composant n'aura a changer.
//
// Convention : les identifiants sont des chaines (uuid cote Supabase), les
// montants sont des ENTIERS en francs CFA (le XOF n'a pas de centimes, donc
// pas de decimales a arrondir), et les dates sont des chaines ISO 8601.

/** Montant en francs CFA, toujours un entier. */
export type Amount = number
/** Date ISO 8601 (`2026-09-09T14:32:00.000Z`). */
export type IsoDate = string

// --- CATALOGUE -------------------------------------------------------------

export type ProductStatus = 'active' | 'hidden' | 'archived'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  /** Ordre d'affichage sur le site public (drag & drop dans le dashboard). */
  position: number
  visible: boolean
  archived: boolean
}

/** Une option a l'interieur d'un groupe de variantes (ex. « 50 % de sucre »). */
export interface VariantOption {
  id: string
  label: string
  /** Supplement en FCFA, 0 si l'option est incluse. */
  priceDelta: Amount
  available: boolean
  isDefault?: boolean
}

/** Groupe de variantes : taille, sucre, glace, toppings... */
export interface VariantGroup {
  id: string
  name: string
  /** `single` = un seul choix (taille), `multi` = plusieurs (toppings). */
  type: 'single' | 'multi'
  required: boolean
  options: VariantOption[]
}

export interface Product {
  id: string
  name: string
  slug: string
  shortDescription?: string
  description?: string
  price: Amount
  /** Prix barre : renseigne uniquement en promotion. */
  compareAtPrice?: Amount
  categoryId?: string
  collectionIds: string[]
  image?: string
  gallery: string[]
  /** Visuel alternatif pour le mobile, quand le cadrage large ne marche pas. */
  mobileImage?: string
  /** Couleur d'accent de la fiche produit. */
  color?: string
  status: ProductStatus
  /** `null` = disponibilite geree a la main, sans decompte de stock. */
  stock: number | null
  available: boolean
  position: number
  tags: string[]
  allergens: string[]
  ingredients: string[]
  nutrition?: { kcal?: number; sugar?: number; protein?: number; fat?: number }
  prepTime?: string
  isNew: boolean
  isPopular: boolean
  isFeatured: boolean
  variantGroups: VariantGroup[]
  createdAt: IsoDate
  updatedAt: IsoDate
}

// --- COMMANDES -------------------------------------------------------------

export type OrderStatus =
  | 'new' | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'delivering' | 'delivered' | 'picked_up' | 'completed'
  | 'cancelled' | 'refunded'

/** Comment le client recoit sa commande.
 *
 *  `delivery` : un livreur l'apporte a l'adresse indiquee.
 *  `pickup`   : le client vient la chercher sur place.
 *
 *  Cette distinction change le parcours suivi par la commande : une commande
 *  a retirer ne passe jamais par « En livraison » ni « Livrée », et ne
 *  supporte aucun frais de livraison. */
export type Fulfillment = 'delivery' | 'pickup'

export type PaymentStatus =
  | 'initiated' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'

export type PaymentMethod = 'cash' | 'momo' | 'moov' | 'celtiis' | 'card' | 'other'

export interface OrderItem {
  id: string
  productId: string
  /** Nom fige a la commande : si le produit est renomme plus tard, la
   *  commande historique doit garder le nom d'origine. */
  productName: string
  unitPrice: Amount
  qty: number
  /** Options retenues, figees de la meme facon. */
  options: { groupName: string; optionLabel: string; priceDelta: Amount }[]
  lineTotal: Amount
}

/** Une entree d'historique : qui a change le statut, quand et pourquoi. */
export interface OrderStatusEvent {
  status: OrderStatus
  at: IsoDate
  by: string
  reason?: string
}

export interface Order {
  id: string
  /** Numero lisible affiche au client (`#1042`). */
  reference: string
  customerId?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  items: OrderItem[]
  subtotal: Amount
  deliveryFee: Amount
  discount: Amount
  total: Amount
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: OrderStatus
  /** Livraison ou retrait sur place. Absent sur les commandes anterieures a
   *  l'ajout du retrait : elles sont alors traitees comme des livraisons. */
  fulfillment?: Fulfillment
  address?: string
  zoneId?: string
  zoneName?: string
  customerNote?: string
  /** Motif d'annulation, obligatoire pour toute commande annulee. */
  cancelReason?: string
  cancelledBy?: string
  cancelledAt?: IsoDate
  statusHistory: OrderStatusEvent[]
  createdAt: IsoDate
  updatedAt: IsoDate
}

export interface Payment {
  id: string
  transactionId: string
  orderId: string
  orderReference: string
  customerName: string
  amount: Amount
  method: PaymentMethod
  status: PaymentStatus
  /** Reference renvoyee par le prestataire (Kkiapay, FedaPay...). */
  providerRef?: string
  /** Message d'erreur du prestataire, pour diagnostiquer un echec. */
  errorMessage?: string
  createdAt: IsoDate
}

export interface Refund {
  id: string
  paymentId: string
  orderId: string
  amount: Amount
  reason: string
  by: string
  createdAt: IsoDate
}

// --- DEPENSES --------------------------------------------------------------
// Ce que la boutique ACHETE : ingredients, gobelets, condiments, livraison,
// loyer... C'est ce qui permet de passer du chiffre d'affaires au benefice
// reel. Sans cela, le dashboard ne montre que l'argent qui entre.

export type ExpenseCategory =
  | 'ingredients'   // thes, laits, sirops, perles, fruits
  | 'condiments'    // sucre, toppings, gobelets, pailles, couvercles
  | 'packaging'     // sacs, serviettes, etiquettes
  | 'equipment'     // materiel, reparations
  | 'delivery'      // carburant, coursiers
  | 'rent'          // loyer, electricite, eau
  | 'salary'        // salaires
  | 'marketing'     // publicite, impressions
  | 'other'

export interface Expense {
  id: string
  label: string
  category: ExpenseCategory
  /** Montant en FCFA, toujours positif. */
  amount: Amount
  /** Date de la depense (et non de la saisie) : c'est elle qui compte pour
   *  rattacher la depense au bon mois. */
  spentAt: IsoDate
  supplier?: string
  note?: string
  /** Reference de recu, pour retrouver le justificatif papier. */
  receipt?: string
  createdAt: IsoDate
}

// --- CLIENTS ---------------------------------------------------------------

/** Segment calcule automatiquement, jamais saisi a la main. */
export type CustomerSegment = 'new' | 'regular' | 'loyal' | 'big_spender' | 'inactive'

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  addresses: string[]
  /** Notes internes, invisibles du client. */
  notes?: string
  createdAt: IsoDate
}

/** Statistiques client derivees des commandes : jamais stockees en base,
 *  toujours recalculees, pour ne pas avoir de compteurs qui divergent. */
export interface CustomerStats {
  orderCount: number
  cancelledCount: number
  totalSpent: Amount
  averageOrder: Amount
  firstOrderAt?: IsoDate
  lastOrderAt?: IsoDate
  favoriteProducts: { productName: string; qty: number }[]
  segment: CustomerSegment
}

// --- CONTENU DU SITE (CMS) -------------------------------------------------

/** Un champ editable d'une section : le `kind` pilote le controle affiche
 *  dans le dashboard (texte court, zone de texte, image, lien...). */
export interface ContentField {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'image' | 'url' | 'color' | 'badge'
  value: string
}

export interface SiteSection {
  id: string
  /** Nom lisible dans le dashboard (« Hero », « On sirote Snaki »). */
  name: string
  /** Page a laquelle la section appartient. */
  page: 'home' | 'bobas' | 'global'
  visible: boolean
  position: number
  fields: ContentField[]
  /** Une section structurelle ne peut etre ni masquee ni deplacee. */
  locked?: boolean
}

// --- MEDIATHEQUE -----------------------------------------------------------

export interface MediaAsset {
  id: string
  name: string
  url: string
  /** Octets. */
  size: number
  width?: number
  height?: number
  format: string
  /** Ou le media est utilise, pour ne pas supprimer une image en service. */
  usedIn: string[]
  createdAt: IsoDate
}

// --- PROMOTIONS, ZONES, HORAIRES -------------------------------------------

export type PromotionKind = 'percent' | 'fixed' | 'free_delivery'

export interface Promotion {
  id: string
  code: string
  kind: PromotionKind
  /** Pourcentage (1-100) ou montant fixe en FCFA selon `kind`. */
  value: number
  startsAt?: IsoDate
  endsAt?: IsoDate
  maxUses?: number
  usedCount: number
  minOrder?: Amount
  productIds: string[]
  oncePerCustomer: boolean
  active: boolean
  createdAt: IsoDate
}

export interface DeliveryZone {
  id: string
  name: string
  area?: string
  available: boolean
  fee: Amount
  minOrder: Amount
  /** Delai estime affiche au client (« 25-40 min »). */
  eta?: string
  priority: number
}

export interface OpeningHour {
  /** 0 = dimanche, 6 = samedi. */
  day: number
  open: string
  close: string
  closed: boolean
}

export interface Closure {
  id: string
  from: IsoDate
  to: IsoDate
  reason: string
}

// --- AVIS ------------------------------------------------------------------

export interface Review {
  id: string
  customerName: string
  rating: number
  comment: string
  productId?: string
  status: 'pending' | 'approved' | 'hidden'
  featured: boolean
  reply?: string
  createdAt: IsoDate
}

// --- ANALYTICS -------------------------------------------------------------

export type AnalyticsEventName =
  | 'page_view' | 'product_view' | 'product_click'
  | 'add_to_cart' | 'remove_from_cart' | 'cart_open'
  | 'checkout_started' | 'payment_started' | 'payment_success' | 'payment_failed'
  | 'order_created' | 'order_cancelled'
  | 'promo_clicked' | 'whatsapp_clicked' | 'instagram_clicked' | 'location_clicked'

export interface AnalyticsEvent {
  id: string
  name: AnalyticsEventName
  sessionId: string
  userId?: string
  productId?: string
  orderId?: string
  /** Valeur monetaire associee, quand l'evenement en porte une. */
  value?: Amount
  path?: string
  source?: string
  device: 'mobile' | 'tablet' | 'desktop'
  at: IsoDate
}

export interface AnalyticsSession {
  id: string
  startedAt: IsoDate
  lastSeenAt: IsoDate
  device: 'mobile' | 'tablet' | 'desktop'
  source?: string
  /** Pas d'adresse IP ni de donnee personnelle : seul le pays, quand il est
   *  disponible et legalement collectable. */
  country?: string
  pageViews: number
}

// --- UTILISATEURS, ROLES, JOURNAL -----------------------------------------

export type Permission =
  | 'orders.view' | 'orders.edit' | 'orders.refund'
  | 'products.view' | 'products.edit'
  | 'content.edit' | 'media.edit'
  | 'customers.view'
  | 'finance.view'
  | 'promotions.edit'
  | 'analytics.view'
  | 'settings.edit'
  | 'users.manage'

export type RoleName = 'super_admin' | 'manager' | 'orders_staff' | 'content_editor'

export interface Role {
  name: RoleName
  label: string
  permissions: Permission[]
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: RoleName
  active: boolean
  lastLoginAt?: IsoDate
  createdAt: IsoDate
}

export interface AuditLog {
  id: string
  /** Description lisible : « Prix de Matcha Nuage modifie de 3 500 F a 3 800 F ». */
  message: string
  actor: string
  entity: string
  entityId?: string
  action: 'create' | 'update' | 'delete' | 'archive' | 'login' | 'status'
  at: IsoDate
}

export interface AdminNotification {
  id: string
  kind: 'order' | 'payment' | 'payment_failed' | 'cancel' | 'stock' | 'system'
  title: string
  message: string
  read: boolean
  at: IsoDate
}

// --- PARAMETRES ------------------------------------------------------------

export interface SiteSettings {
  brandName: string
  logo?: string
  favicon?: string
  whatsapp: string
  phone: string
  email: string
  instagram?: string
  tiktok?: string
  address: string
  currency: string
  defaultDeliveryFee: Amount
  minOrder: Amount
  /** Interrupteur global : quand il est a `false`, le site public affiche
   *  `ordersClosedMessage` et desactive le passage de commande. */
  acceptingOrders: boolean
  ordersClosedMessage: string
  openingHours: OpeningHour[]
  closures: Closure[]
  legalTerms?: string
  privacyPolicy?: string
  seo: { title: string; description: string; ogImage?: string; noindex: boolean }
}

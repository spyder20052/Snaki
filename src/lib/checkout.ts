// ===========================================================================
// SNAKI — PASSAGE DE COMMANDE (site public → Supabase)
// ===========================================================================
// Envoie la commande en base via la fonction `place_order`, plutot que
// d'ecrire directement dans les tables.
//
// Pourquoi passer par une fonction serveur : le visiteur n'a aucun droit
// d'ecriture sur `orders`. Si on lui en donnait, n'importe qui pourrait
// fabriquer une commande a 0 F ou modifier celles des autres. La fonction
// revalide tout — disponibilite, zone, minimum — et surtout relit les PRIX
// depuis le catalogue au lieu de faire confiance au navigateur.
//
// En cas d'indisponibilite du reseau, on retombe sur l'enregistrement local
// pour que le client ne perde pas sa commande : elle sera visible dans son
// espace, et l'equipe pourra la reprendre par telephone.

import { supabase } from './supabase'
import { saveSimulatedCheckout } from './localCommerce'
import type { StoredCartLine } from './localCommerce'
import type { Fulfillment, PaymentMethod } from '../admin/types'

export interface CheckoutInput {
  lines: StoredCartLine[]
  subtotal: number
  deliveryFee: number
  name: string
  phone: string
  email?: string
  address: string
  zone: string
  method: PaymentMethod
  /** Livraison ou retrait sur place. Par defaut une livraison, pour rester
   *  compatible avec les appels anterieurs. */
  fulfillment?: Fulfillment
}

export interface CheckoutResult {
  reference: string
  total: number
  /** `local` quand la commande n'a pas pu partir en base : l'interface
   *  l'indique au client plutot que de laisser croire a un enregistrement
   *  complet. */
  storage: 'supabase' | 'local'
  message?: string
}

/** Le panier ne retient que le nom de la boisson. La fonction serveur, elle,
 *  exige un identifiant produit — c'est ce qui lui permet de relire le prix
 *  reel. On fait donc la correspondance par nom, sur le catalogue publie. */
async function resolveItems(lines: StoredCartLine[]) {
  const { data, error } = await supabase
    .from('products')
    .select('id,name')
    .eq('status', 'active')
  if (error) throw new Error(error.message)

  const byName = new Map((data ?? []).map(p => [p.name.toLowerCase().trim(), p.id]))
  const items: { product_id: string; qty: number }[] = []
  const missing: string[] = []

  for (const line of lines) {
    const id = byName.get(line.name.toLowerCase().trim())
    if (id) items.push({ product_id: id, qty: line.qty })
    else missing.push(line.name)
  }
  return { items, missing }
}

/** Retrouve l'identifiant d'une zone a partir de son nom affiche. */
async function resolveZone(zoneName: string): Promise<string | null> {
  if (!zoneName?.trim()) return null
  const { data } = await supabase
    .from('delivery_zones')
    .select('id,name')
    .eq('available', true)
  const match = (data ?? []).find(
    z => z.name.toLowerCase().trim() === zoneName.toLowerCase().trim())
  return match?.id ?? null
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    // Un retrait sur place n'a ni zone ni frais de livraison : inutile de
    // chercher une zone que le client n'a pas choisie.
    const pickup = input.fulfillment === 'pickup'
    const [{ items, missing }, zoneId] = await Promise.all([
      resolveItems(input.lines),
      pickup ? Promise.resolve(null) : resolveZone(input.zone),
    ])

    // Un produit du panier absent du catalogue signifie qu'il a ete retire
    // ou renomme depuis l'ajout : mieux vaut le dire que de commander autre
    // chose a la place.
    if (missing.length > 0) {
      throw new Error(
        `${missing.join(', ')} n’est plus disponible. Retire-le du panier.`)
    }
    if (items.length === 0) throw new Error('Le panier est vide.')

    const { data, error } = await supabase.rpc('place_order', {
      payload: {
        name: input.name,
        phone: input.phone,
        email: input.email ?? '',
        address: input.address,
        zone_id: zoneId,
        method: input.method,
        fulfillment: input.fulfillment ?? 'delivery',
        items,
      },
    })
    if (error) throw new Error(error.message)

    const result = data as { reference: string; total: number }
    // Miroir local : l'espace client fonctionne hors ligne et affiche la
    // commande immediatement, sans attendre un rechargement.
    saveSimulatedCheckout(input)
    return { reference: result.reference, total: result.total, storage: 'supabase' }
  } catch (e) {
    // Repli : la commande est conservee localement pour ne pas etre perdue.
    const local = saveSimulatedCheckout(input)
    return {
      reference: local.reference,
      total: local.total,
      storage: 'local',
      message: e instanceof Error ? e.message : 'Connexion indisponible.',
    }
  }
}

/** Commandes du client, lues en base par son numero. Sert a l'espace client
 *  pour retrouver ses commandes depuis n'importe quel appareil, et non
 *  seulement celui ou il a commande. */
export async function fetchMyOrders(phone: string) {
  try {
    const { data, error } = await supabase.rpc('my_orders', { phone_input: phone })
    if (error) return []
    return (data ?? []) as Record<string, unknown>[]
  } catch {
    return []
  }
}

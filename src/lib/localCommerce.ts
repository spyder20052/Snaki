import type { Customer, Fulfillment, Order, Payment, PaymentMethod } from '../admin/types'

const CART_KEY = 'snaki.cart.v1'
const ORDERS_KEY = 'snaki.simulated-orders.v1'
const PAYMENTS_KEY = 'snaki.simulated-payments.v1'
const CUSTOMERS_KEY = 'snaki.simulated-customers.v1'
const PROFILE_KEY = 'snaki.checkout-profile.v1'

export type StoredCartLine = { name: string; price: string; qty: number }
export type CheckoutProfile = { name: string; phone: string; email: string; address: string; zone: string }

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* stockage indisponible */ }
}

export const loadStoredCart = () => read<StoredCartLine[]>(CART_KEY, [])
export const saveStoredCart = (lines: StoredCartLine[]) => write(CART_KEY, lines)
export const loadSimulatedOrders = () => read<Order[]>(ORDERS_KEY, [])
export const loadSimulatedPayments = () => read<Payment[]>(PAYMENTS_KEY, [])
export const loadSimulatedCustomers = () => read<Customer[]>(CUSTOMERS_KEY, [])
export const loadCheckoutProfile = () => read<CheckoutProfile>(PROFILE_KEY, { name: '', phone: '', email: '', address: '', zone: '' })
export const saveCheckoutProfile = (profile: CheckoutProfile) => write(PROFILE_KEY, profile)

export function saveSimulatedCheckout(input: {
  lines: StoredCartLine[]; subtotal: number; deliveryFee: number; name: string; phone: string; email?: string
  address: string; zone: string; method: PaymentMethod; fulfillment?: Fulfillment
}) {
  // Une commande a retirer ne supporte aucun frais de livraison, meme si le
  // panier en avait calcule avant que le client change d'avis.
  const pickup = input.fulfillment === 'pickup'
  const deliveryFee = pickup ? 0 : input.deliveryFee
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const customerId = crypto.randomUUID()
  const reference = `#S${Date.now().toString().slice(-6)}`
  const priceValue = (price: string) => Number(price.replace(/[^\d]/g, '')) || 0
  const order: Order = {
    id, reference, customerId, customerName: input.name, customerPhone: input.phone,
    customerEmail: input.email || undefined,
    fulfillment: input.fulfillment ?? 'delivery',
    // Ni adresse ni zone pour un retrait : le client vient sur place.
    address: pickup ? undefined : input.address,
    zoneName: pickup ? undefined : input.zone,
    items: input.lines.map(line => ({ id: crypto.randomUUID(), productId: '', productName: line.name,
      unitPrice: priceValue(line.price), qty: line.qty, options: [], lineTotal: priceValue(line.price) * line.qty })),
    subtotal: input.subtotal, deliveryFee, discount: 0, total: input.subtotal + deliveryFee,
    paymentMethod: input.method, paymentStatus: 'succeeded', status: 'new',
    statusHistory: [{ status: 'new', at: now, by: 'Commande en ligne' }], createdAt: now, updatedAt: now,
  }
  const payment: Payment = { id: crypto.randomUUID(), transactionId: `SIM-${Date.now()}`, orderId: id,
    orderReference: reference, customerName: input.name, amount: input.subtotal + deliveryFee, method: input.method,
    status: 'succeeded', providerRef: 'PAIEMENT-SIMULE', createdAt: now }
  const customer: Customer = { id: customerId, name: input.name, phone: input.phone,
    email: input.email || undefined, addresses: pickup ? [] : [input.address], createdAt: now }
  write(ORDERS_KEY, [order, ...loadSimulatedOrders()])
  write(PAYMENTS_KEY, [payment, ...loadSimulatedPayments()])
  const customers = loadSimulatedCustomers().filter(item => item.phone !== input.phone)
  write(CUSTOMERS_KEY, [customer, ...customers])
  write(PROFILE_KEY, { name: input.name, phone: input.phone, email: input.email || '', address: input.address, zone: input.zone })
  window.dispatchEvent(new CustomEvent('snaki:checkout'))
  return order
}

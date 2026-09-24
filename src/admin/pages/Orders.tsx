import { Icon } from '../Icon'
// Commandes : liste, recherche multi-criteres, filtres, detail complet,
// changement de statut avec historique, et onglet dedie aux annulations.
//
// Le statut se change par BOUTONS, jamais par liste deroulante : l'equipe
// voit d'un coup d'oeil tout le parcours et l'etape en cours, sans avoir a
// ouvrir un menu. Deux endroits le permettent — le bouton d'avancement
// direct dans la liste, et le detail de la commande pour revenir en arriere
// ou annuler.

import { useMemo, useState } from 'react'
import { PageHead, useCurrentPermissions } from '../AdminApp'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_TONE,
  customerMessage, formatAmount, formatDateTime, notifiesCustomer, orderFlow,
  setOrderStatus, useData, FULFILLMENT_LABELS,
} from '../store'
import type { Order, OrderStatus } from '../types'
import {
  Badge, Button, Card, EmptyState, Field, Modal, Notice, Pagination,
  SearchInput, Select, SortHeader, Textarea, exportCsv, usePagination,
  useSort, useToast,
} from '../ui'

function OrderDetail({ order, onClose }: {
  order: Order
  onClose: () => void
}) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [next, setNext] = useState<OrderStatus>(order.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canEdit = useCurrentPermissions().includes('orders.edit')

  return (
    <Modal
      open onClose={() => { if (!saving) onClose() }} wide
      title={`Commande ${order.reference}`}
      footer={
        <>
          <Button variant="ghost" disabled={saving} onClick={onClose}>Fermer</Button>
          {canEdit && <Button disabled={saving || next === order.status}
            onClick={async () => {
              setError(''); setSaving(true)
              // WhatsApp est ouvert AVANT d'attendre la sauvegarde : passe
              // un `await`, le navigateur considere que l'ouverture ne
              // decoule plus du clic et la bloque.
              const opened = notifiesCustomer(next, order.fulfillment)
                ? openWhatsApp({ ...order, status: next, cancelReason: reason.trim() || undefined }, next)
                : true
              try {
                await setOrderStatus(order.id, next, reason.trim() || undefined)
                toast({ tone: 'success', title: 'Statut enregistré', message: ORDER_STATUS_LABELS[next] })
                onClose()
                // Fenetre bloquee ou numero inexploitable : on le signale
                // sans ouvrir de fenetre de secours.
                if (!opened) toast({
                  tone: 'warning',
                  title: 'WhatsApp n’a pas pu s’ouvrir',
                  message: 'Autorisez les fenêtres pour ce site, ou vérifiez le numéro du client.',
                })
              } catch(e) { setError(e instanceof Error ? e.message : 'Échec de la sauvegarde.') }
              finally { setSaving(false) }
            }}
          >{saving ? 'Enregistrement…' : 'Enregistrer le statut'}</Button>}
        </>
      }
    >
      <div className="sk-stack">
        {error && <p role="alert" className="sk-notice sk-notice-warning">{error}</p>}
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Card title="Client">
            <p className="sk-text-sm"><strong>{order.customerName}</strong></p>
            <p className="sk-text-sm sk-muted">{order.customerPhone}</p>
            {order.customerEmail && <p className="sk-text-sm sk-muted">{order.customerEmail}</p>}
            {order.address && <p className="sk-text-sm sk-muted" style={{ marginTop: 6 }}>{order.address}</p>}
            {order.zoneName && <Badge tone="neutral">{order.zoneName}</Badge>}
          </Card>
          <Card title="Paiement">
            <p className="sk-text-sm">Moyen : <strong>{order.paymentMethod}</strong></p>
            <p className="sk-text-sm">État : <Badge tone={order.paymentStatus === 'succeeded' ? 'success' : 'warning'}>{order.paymentStatus}</Badge></p>
            <p className="sk-text-sm sk-muted" style={{ marginTop: 6 }}>{formatDateTime(order.createdAt)}</p>
          </Card>
        </div>

        <Card title="Articles" padded={false}>
          <div className="sk-table-wrap"><table className="sk-table">
            <thead>
              <tr><th>Produit</th><th>Options</th><th className="sk-table-numeric">Qté</th><th className="sk-table-numeric">Total</th></tr>
            </thead>
            <tbody>
              {order.items.map(it => (
                <tr key={it.id}>
                  <td><strong>{it.productName}</strong></td>
                  <td className="sk-text-xs sk-muted">
                    {it.options.map(o => `${o.groupName}: ${o.optionLabel}`).join(' · ') || '—'}
                  </td>
                  <td className="sk-table-numeric">{it.qty}</td>
                  <td className="sk-table-numeric sk-numeric">{formatAmount(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="sk-card-foot">
            <div className="sk-stack sk-stack-sm">
              <div className="sk-row sk-row-between"><span className="sk-text-sm">Sous-total</span><span className="sk-numeric">{formatAmount(order.subtotal)}</span></div>
              <div className="sk-row sk-row-between"><span className="sk-text-sm">Livraison</span><span className="sk-numeric">{formatAmount(order.deliveryFee)}</span></div>
              {order.discount > 0 && (
                <div className="sk-row sk-row-between"><span className="sk-text-sm">Remise</span><span className="sk-numeric">−{formatAmount(order.discount)}</span></div>
              )}
              <div className="sk-row sk-row-between" style={{ fontWeight: 700 }}>
                <span>Total</span><span className="sk-numeric">{formatAmount(order.total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {order.customerNote && (
          <Card title="Note du client"><p className="sk-text-sm">{order.customerNote}</p></Card>
        )}

        <Card title="Changer le statut">
          <div className="sk-stack">
            {/* Tous les etats sont affiches en boutons, dans l'ordre reel du
                parcours. Plus de liste deroulante : on voit d'un coup d'oeil
                ou en est la commande et ce qu'on peut faire, sans ouvrir de
                menu. L'etat actuel est marque, le choix en cours est en
                surbrillance. */}
            {canEdit && (
              <div className="sk-row sk-row-wrap" style={{ gap: 6 }}>
                {/* `pending` (paiement en attente) ne fait pas partie du
                    parcours normal : il n'apparait que s'il est l'etat en
                    cours, pour que la commande ne soit jamais affichee sans
                    son propre etat. */}
                {(order.status === 'pending'
                  ? (['pending', ...orderFlow(order.fulfillment).filter(s => s !== 'new')] as OrderStatus[])
                  : orderFlow(order.fulfillment)).map(st => (
                  <Button
                    key={st} size="sm" disabled={saving}
                    variant={next === st ? 'primary' : 'outline'}
                    onClick={() => setNext(st)}
                  >{st === order.status ? `${ORDER_STATUS_LABELS[st]} (actuel)` : ORDER_STATUS_LABELS[st]}</Button>
                ))}
                <Button
                  size="sm" disabled={saving}
                  variant={next === 'cancelled' ? 'destructive' : 'ghost'}
                  onClick={() => setNext('cancelled')}
                >{order.status === 'cancelled' ? 'Annulée (actuel)' : 'Annuler'}</Button>
                {/* Le remboursement n'apparait que sur une commande deja
                    remboursee : il se declenche depuis la page Paiements,
                    pas ici, pour ne pas melanger les deux gestes. */}
                {order.status === 'refunded' && (
                  <Button
                    size="sm" disabled={saving}
                    variant={next === 'refunded' ? 'destructive' : 'ghost'}
                    onClick={() => setNext('refunded')}
                  >Remboursée (actuel)</Button>
                )}
              </div>
            )}
            {(next === 'cancelled' || next === 'refunded') && (
              <Field label="Motif" required hint="Obligatoire pour une annulation ou un remboursement.">
                <Textarea value={reason} onChange={e => setReason(e.target.value)} />
              </Field>
            )}
          </div>
        </Card>

        <Card title="Historique" padded={false}>
          {order.statusHistory.length === 0 ? (
            <div className="sk-card-body"><p className="sk-text-sm sk-dim">Aucun changement enregistré.</p></div>
          ) : (
            <table className="sk-table">
              <tbody>
                {[...order.statusHistory].reverse().map((h, i) => (
                  <tr key={i}>
                    <td><Badge tone={ORDER_STATUS_TONE[h.status]}>{ORDER_STATUS_LABELS[h.status]}</Badge></td>
                    <td className="sk-text-xs sk-muted">{h.by}</td>
                    <td className="sk-text-xs sk-muted">{h.reason ?? ''}</td>
                    <td className="sk-text-xs sk-dim">{formatDateTime(h.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Modal>
  )
}

/** Bouton d'avancement : fait passer la commande a l'etape suivante en un
 *  clic, puis propose de prevenir le client si l'etape le justifie.
 *
 *  Le libelle annonce la DESTINATION (« Confirmer », « Préparer ») et non
 *  l'etat courant : l'utilisateur lit ce qui va se passer, pas ce qui est.
 *  Il sert aussi a garder la rangee de statuts compacte dans le tableau. */
const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  new: 'Nouvelle',
  pending: 'Attente',
  confirmed: 'Confirmer',
  preparing: 'Préparer',
  ready: 'Prête',
  delivering: 'Livrer',
  delivered: 'Livrée',
  completed: 'Terminer',
}

/** Numero au format international attendu par wa.me : indicatif + numero,
 *  sans espace ni signe.
 *
 *  Attention : au Benin le « 0 » de « 01 » fait PARTIE du numero (les
 *  mobiles ont dix chiffres depuis 2020, tous commencant par 01). Ce n'est
 *  pas un prefixe interurbain a retirer. */
function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('229') ? digits : `229${digits}`
}

/** Ouvre WhatsApp avec le message deja ecrit.
 *
 *  Doit etre appele DIRECTEMENT depuis un clic : les navigateurs bloquent
 *  l'ouverture d'un onglet qui ne decoule pas d'un geste de l'utilisateur.
 *  C'est pourquoi on n'attend pas la fin de la sauvegarde avant d'ouvrir. */
function openWhatsApp(order: Order, status: OrderStatus): boolean {
  const number = waNumber(order.customerPhone)
  // Un numero trop court ne donnerait qu'une page d'erreur WhatsApp.
  if (number.length < 11) return false
  const text = encodeURIComponent(customerMessage(order, status))
  const win = window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener')
  return !!win
}

/** Rangee de statuts affichee directement dans la ligne du tableau.
 *
 *  Tous les etats du parcours sont visibles d'un coup : l'equipe voit ou en
 *  est chaque commande et peut la deplacer sans ouvrir le detail. L'etat
 *  courant est mis en avant ; les autres restent cliquables, en avant comme
 *  en arriere. */
function StatusRow({ order }: { order: Order }) {
  const toast = useToast()

  // Une commande annulee ou remboursee ne bouge plus depuis la liste : la
  // reouvrir est un geste rare, qui passe par le detail.
  if (order.status === 'cancelled' || order.status === 'refunded') return null

  // Le parcours depend du mode de remise : une commande a retirer ne passe
  // jamais par « En livraison » ni « Livrée ».
  const flow = orderFlow(order.fulfillment)

  // `pending` n'est pas dans le parcours normal : il ne s'affiche que s'il
  // est l'etat en cours, pour que la ligne montre toujours sa position.
  const etats: OrderStatus[] = order.status === 'pending'
    ? (['pending', ...flow.filter(s => s !== 'new')] as OrderStatus[])
    : flow

  const appliquer = (cible: OrderStatus) => {
    // Le changement est applique LOCALEMENT d'abord : la ligne affiche le
    // nouvel etat aussitot. L'enregistrement continue en arriere-plan —
    // inutile de bloquer l'ecran pendant l'aller-retour reseau.
    const saving = setOrderStatus(order.id, cible)
    toast({
      tone: 'success',
      title: `${order.reference} vers ${ORDER_STATUS_LABELS[cible]}`,
    })
    // Etape cle : WhatsApp s'ouvre DIRECTEMENT, message pre-rempli.
    //
    // L'ouverture doit se faire dans ce gestionnaire, pas apres un `await` :
    // le navigateur bloque tout onglet ouvert hors d'un geste utilisateur.
    if (notifiesCustomer(cible, order.fulfillment)
        && !openWhatsApp({ ...order, status: cible }, cible)) {
      toast({
        tone: 'warning',
        title: 'WhatsApp n’a pas pu s’ouvrir',
        message: 'Autorisez les fenêtres pour ce site, ou vérifiez le numéro du client.',
      })
    }
    // Seul un ECHEC interrompt : on previent alors, et le store a deja
    // recharge l'etat reel depuis la base.
    saving.catch((e: unknown) => {
      toast({
        tone: 'danger',
        title: 'Changement non enregistré',
        message: e instanceof Error ? e.message : undefined,
      })
    })
  }

  return (
    // `sk-status-row` tient la mise en forme : une seule ligne, boutons
    // resserres, jamais de retour a la ligne (voir components.css).
    <div className="sk-status-row">
      {etats.map(st => (
        <Button
          key={st} size="sm"
          variant={st === order.status ? 'primary' : 'outline'}
          // Recliquer sur l'etat courant ne ferait qu'une ecriture inutile.
          disabled={st === order.status}
          onClick={() => appliquer(st)}
          // Libelle court : sept boutons doivent tenir dans une cellule.
          // « Préparer » plutot que « En préparation ».
        >{ADVANCE_LABEL[st] ?? ORDER_STATUS_LABELS[st]}</Button>
      ))}
    </div>
  )
}

export function OrdersPage() {
  const d = useData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'cancelled' | OrderStatus>('all')
  const [zone, setZone] = useState('')
  const [stage, setStage] = useState<string[]>([])
  const [method, setMethod] = useState('')
  const [open, setOpen] = useState<Order | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.orders.filter(o => {
      if (stage.length && !stage.includes(o.status)) return false
      if (status !== 'all' && o.status !== status) return false
      if (zone && o.zoneId !== zone) return false
      if (method && o.paymentMethod !== method) return false
      if (!q) return true
      return o.reference.toLowerCase().includes(q)
        || o.customerName.toLowerCase().includes(q)
        || o.customerPhone.includes(q)
        || (o.customerEmail?.toLowerCase().includes(q) ?? false)
    })
  }, [d.orders, query, status, zone, method, stage])

  const { sorted, sortKey, sortDir, toggleSort } = useSort(filtered, 'createdAt')
  const pager = usePagination(sorted, 15)

  const cancelled = d.orders.filter(o => o.status === 'cancelled')
  const lostRevenue = cancelled.reduce((s, o) => s + o.total, 0)

  return (
    <>
      <PageHead
        title="Commandes"
        subtitle="Recherche par numéro, nom, téléphone ou e-mail. Chaque changement de statut est historisé."
        actions={
          d.orders.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportCsv('commandes.csv',
              d.orders.map(o => ({
                reference: o.reference, date: o.createdAt, client: o.customerName,
                telephone: o.customerPhone, total: o.total, statut: ORDER_STATUS_LABELS[o.status],
                paiement: o.paymentMethod, zone: o.zoneName ?? '',
              })))}>Exporter CSV</Button>
          )
        }
      />
      <section className="orders-workflow" aria-label="Suivi des commandes">
        {[{label:'À confirmer',states:['new','pending'],icon:'orders'},{label:'En préparation',states:['confirmed','preparing'],icon:'products'},{label:'Prêtes ou en livraison',states:['ready','delivering'],icon:'zones'}].map((step,i)=><button key={step.label} aria-pressed={stage[0]===step.states[0]} onClick={()=>{setStage(stage[0]===step.states[0]?[]:step.states);setStatus('all');pager.reset()}} title={'Afficher : '+step.label}><span className="orders-step-number">0{i+1}</span><span><strong>{step.label}</strong><small>{step.states.map(s=>ORDER_STATUS_LABELS[s as OrderStatus]).join(' · ')}</small></span><b>{d.orders.filter(o=>step.states.includes(o.status)).length}</b><Icon name={step.icon} size={30}/></button>)}
      </section>

      {d.orders.length === 0 ? (
        <>
          <div style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Notice tone="warning">
              <strong>Aucune commande enregistrée.</strong>
              <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>Cette page affiche les commandes enregistrées dans Supabase. Un panier non validé ne constitue pas encore une commande.</p>
            </Notice>
          </div>
          <Card padded={false}>
            <EmptyState
              icon={<Icon name="orders" />}
              title="Aucune commande"
              text="Les commandes passées sur le site apparaîtront ici avec leur détail, leur statut et leur historique."
            />
          </Card>
        </>
      ) : (
        <>
          <div className="sk-toolbar">
            <SearchInput value={query} onChange={v => { setQuery(v); pager.reset() }} placeholder="N°, nom, téléphone, e-mail…" />
            <Select aria-label="Filtrer par statut" value={status} onChange={e => {setStage([]);setStatus(e.target.value as OrderStatus | 'all');pager.reset()}} style={{ width: 'auto' }}>
              <option value="all">Tous les statuts</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select aria-label="Filtrer par zone" value={zone} onChange={e => {setZone(e.target.value);pager.reset()}} style={{ width: 'auto' }}>
              <option value="">Toutes les zones</option>
              {d.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
            <Select aria-label="Filtrer par paiement" value={method} onChange={e => {setMethod(e.target.value);pager.reset()}} style={{ width: 'auto' }}>
              <option value="">Tous les paiements</option>
              <option value="cash">Espèces</option>
              <option value="momo">MTN MoMo</option>
              <option value="moov">Moov Money</option>
              <option value="celtiis">Celtiis Cash</option>
              <option value="card">Carte</option>
              <option value="other">Autre</option>
            </Select>
          </div>

          {cancelled.length > 0 && (
            <div className="sk-bulkbar">
              <strong>{cancelled.length} commande(s) annulée(s)</strong>
              <span className="sk-muted">Montant perdu : {formatAmount(lostRevenue)}</span>
              <Button size="sm" variant="outline" onClick={() => {setStage([]);setStatus('cancelled');pager.reset()}}>Voir</Button>
            </div>
          )}

          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr>
                  <SortHeader label="N°" active={sortKey === 'reference'} dir={sortDir} onClick={() => toggleSort('reference')} />
                  <SortHeader label="Date" active={sortKey === 'createdAt'} dir={sortDir} onClick={() => toggleSort('createdAt')} />
                  <th>Client</th>
                  <th>Statut</th>
                  <th>Paiement</th>
                  <SortHeader label="Total" numeric active={sortKey === 'total'} dir={sortDir} onClick={() => toggleSort('total')} />
                  <th className="sk-table-actions" />
                </tr>
              </thead>
              <tbody>
                {pager.slice.length===0 && <tr><td colSpan={7}><EmptyState title="Aucune commande ne correspond" text="Modifiez vos filtres ou effacez la recherche." action={<Button variant="outline" onClick={()=>{setStage([]);setQuery('');setStatus('all');setZone('');setMethod('');pager.reset()}}>Réinitialiser les filtres</Button>}/></td></tr>}
                {pager.slice.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.reference}</strong></td>
                    <td className="sk-text-xs sk-muted">{formatDateTime(o.createdAt)}</td>
                    <td>
                      {o.customerName}
                      <p className="sk-text-xs sk-dim" style={{ margin: 0 }}>{o.customerPhone}</p>
                    </td>
                    <td>
                      <Badge tone={ORDER_STATUS_TONE[o.status]} dot>{ORDER_STATUS_LABELS[o.status]}</Badge>
                      {/* Le mode de remise explique pourquoi une commande a
                          retirer n'affiche pas les etats de livraison. */}
                      <p className="sk-text-xs sk-dim" style={{ margin: '2px 0 0' }}>
                        {FULFILLMENT_LABELS[o.fulfillment ?? 'delivery']}
                      </p>
                    </td>
                    <td className="sk-text-xs">{o.paymentMethod}</td>
                    <td className="sk-table-numeric sk-numeric">{formatAmount(o.total)}</td>
                    <td className="sk-table-actions">
                      {/* Tous les etats sont montres ici, pas seulement le
                          suivant : l'equipe voit le parcours entier sans
                          ouvrir le detail. */}
                      <div className="sk-row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                        <StatusRow order={o} />
                        <Button variant="ghost" size="sm" onClick={() => setOpen(o)}>Détail</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...pager} onChange={pager.setPage} />
          </div>
        </>
      )}

      {open && <OrderDetail order={open} onClose={() => setOpen(null)} />}
    </>
  )
}

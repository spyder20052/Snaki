import { Icon } from '../Icon'
// Clients : fiche complete avec statistiques derivees des commandes et
// segmentation automatique. Rien n'est stocke en double : tout est
// recalcule, donc aucun compteur ne peut divergerie de la realite.

import { useMemo, useState } from 'react'
import { PageHead } from '../AdminApp'
import {
  SEGMENT_LABELS, customerStats, formatAmount, formatDate, saveCustomer, useData,
} from '../store'
import type { Customer } from '../types'
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, Pagination,
  SearchInput, Textarea, exportCsv, usePagination, useToast,
} from '../ui'

const SEGMENT_TONE = {
  new: 'info', regular: 'brand', loyal: 'success',
  big_spender: 'warning', inactive: 'neutral',
} as const

export function CustomersPage() {
  const d = useData()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.customers.filter(c => !q
      || c.name.toLowerCase().includes(q)
      || c.phone.includes(q)
      || (c.email?.toLowerCase().includes(q) ?? false))
  }, [d.customers, query])

  const pager = usePagination(filtered, 15)

  return (
    <>
      <PageHead
        title="Clients"
        subtitle="Fiches clients et segments calculés automatiquement à partir de l’historique de commandes."
        actions={d.customers.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportCsv('clients.csv',
            d.customers.map(c => {
              const s = customerStats(c.id)
              return {
                nom: c.name, telephone: c.phone, email: c.email ?? '',
                commandes: s.orderCount, total_depense: s.totalSpent,
                panier_moyen: s.averageOrder, segment: SEGMENT_LABELS[s.segment],
              }
            }))}>Exporter CSV</Button>
        )}
      />

      {d.customers.length === 0 ? (
        <>
          <div style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Notice tone="warning">
              <strong>Aucun client enregistré.</strong>
              <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>
                Les fiches clients se créeront automatiquement à la première
                commande. Les segments (nouveau, régulier, fidèle, gros
                acheteur, inactif) sont ensuite recalculés en continu.
              </p>
            </Notice>
          </div>
          <Card padded={false}>
            <EmptyState icon={<Icon name="customers" />} title="Aucun client" text="Les clients apparaîtront ici dès la première commande enregistrée." />
          </Card>
        </>
      ) : (
        <>
          <div className="sk-toolbar">
            <SearchInput value={query} onChange={v => { setQuery(v); pager.reset() }} placeholder="Nom, téléphone, e-mail…" />
          </div>
          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr>
                  <th>Client</th><th>Segment</th>
                  <th className="sk-table-numeric">Commandes</th>
                  <th className="sk-table-numeric">Total dépensé</th>
                  <th className="sk-table-numeric">Panier moyen</th>
                  <th>Dernière commande</th><th className="sk-table-actions" />
                </tr>
              </thead>
              <tbody>
                {pager.slice.map(c => {
                  const s = customerStats(c.id)
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <p className="sk-text-xs sk-dim" style={{ margin: 0 }}>{c.phone}</p>
                      </td>
                      <td><Badge tone={SEGMENT_TONE[s.segment]} dot>{SEGMENT_LABELS[s.segment]}</Badge></td>
                      <td className="sk-table-numeric sk-numeric">{s.orderCount}</td>
                      <td className="sk-table-numeric sk-numeric">{formatAmount(s.totalSpent)}</td>
                      <td className="sk-table-numeric sk-numeric">{formatAmount(s.averageOrder)}</td>
                      <td className="sk-text-xs sk-dim">{s.lastOrderAt ? formatDate(s.lastOrderAt) : '—'}</td>
                      <td className="sk-table-actions">
                        <Button variant="ghost" size="sm" onClick={() => setOpen(c)}>Fiche</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination {...pager} onChange={pager.setPage} />
          </div>
        </>
      )}

      {open && <CustomerSheet customer={open} onClose={() => setOpen(null)} />}
    </>
  )
}


/** Fiche client editable.
 *
 *  Un brouillon local est modifie puis enregistre en une fois : on evite
 *  d'ecrire en base a chaque frappe. Les statistiques restent en lecture
 *  seule — elles se deduisent des commandes, les rendre modifiables
 *  creerait un ecart avec la realite. */
function CustomerSheet({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState<Customer>(structuredClone(customer))
  const [saving, setSaving] = useState(false)
  const s = customerStats(customer.id)
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) =>
    setDraft(c => ({ ...c, [k]: v }))

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ tone: 'danger', title: 'Le nom est obligatoire' })
      return
    }
    if (!draft.phone.trim()) {
      toast({ tone: 'danger', title: 'Le téléphone est obligatoire' })
      return
    }
    setSaving(true)
    try {
      await saveCustomer(customer.id, draft)
      toast({ tone: 'success', title: 'Fiche enregistrée', message: draft.name })
      onClose()
    } catch (e) {
      toast({
        tone: 'danger',
        title: 'Enregistrement refusé',
        message: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open onClose={onClose} title={customer.name} wide
      footer={
        <>
          <Button variant="ghost" disabled={saving} onClick={onClose}>Annuler</Button>
          <Button disabled={saving} onClick={save}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="sk-stack">
        {/* Statistiques : lecture seule, recalculees depuis les commandes. */}
        <div className="sk-grid sk-grid-kpi">
          <Card><p className="sk-kpi-label">Commandes</p><p className="sk-kpi-value">{s.orderCount}</p></Card>
          <Card><p className="sk-kpi-label">Total dépensé</p><p className="sk-kpi-value">{formatAmount(s.totalSpent)}</p></Card>
          <Card><p className="sk-kpi-label">Panier moyen</p><p className="sk-kpi-value">{formatAmount(s.averageOrder)}</p></Card>
          <Card><p className="sk-kpi-label">Annulées</p><p className="sk-kpi-value">{s.cancelledCount}</p></Card>
        </div>

        <Card title="Coordonnées">
          <div className="sk-stack">
            <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Field label="Nom" required>
                <Input value={draft.name} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Téléphone" required hint="Relie le client à ses commandes.">
                <Input value={draft.phone} onChange={e => set('phone', e.target.value)} />
              </Field>
            </div>
            <Field label="E-mail">
              <Input
                type="email" value={draft.email ?? ''}
                onChange={e => set('email', e.target.value || undefined)}
              />
            </Field>
            <Field label="Adresses" hint="Une par ligne.">
              <Textarea
                value={draft.addresses.join('\n')}
                onChange={e => set('addresses',
                  e.target.value.split('\n').map(a => a.trim()).filter(Boolean))}
              />
            </Field>
          </div>
        </Card>

        <Card title="Notes internes">
          <Field label="" hint="Invisibles du client.">
            <Textarea
              value={draft.notes ?? ''}
              placeholder="Préférences, remarques de livraison…"
              onChange={e => set('notes', e.target.value || undefined)}
            />
          </Field>
        </Card>

        <Card title="Produits préférés">
          {s.favoriteProducts.length === 0
            ? <p className="sk-text-sm sk-dim">Aucune commande validée.</p>
            : s.favoriteProducts.map(f => (
              <p key={f.productName} className="sk-text-sm">
                {f.productName} — <strong>{f.qty}</strong>
              </p>
            ))}
        </Card>
      </div>
    </Modal>
  )
}

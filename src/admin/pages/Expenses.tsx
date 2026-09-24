// Depenses : ce que la boutique ACHETE. C'est cette page qui permet de
// passer du chiffre d'affaires au benefice reel — sans elle, le dashboard
// ne montre que l'argent qui entre.

import { useMemo, useState } from 'react'
import { PageHead } from '../AdminApp'
import {
  EXPENSE_LABELS, createExpense, deleteExpense, formatAmount, formatDate,
  profitOverPeriod, saveExpense, useData,
} from '../store'
import type { Expense, ExpenseCategory } from '../types'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Kpi, Modal,
  Notice, Pagination, Pill, SearchInput, Select, Textarea, exportCsv,
  usePagination, useToast,
} from '../ui'

type RangeKey = 'month' | 'prev_month' | 'd30' | 'year' | 'all'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'month', label: 'Ce mois' },
  { key: 'prev_month', label: 'Mois précédent' },
  { key: 'd30', label: '30 derniers jours' },
  { key: 'year', label: 'Cette année' },
  { key: 'all', label: 'Tout' },
]

function rangeBounds(key: RangeKey): [Date, Date] {
  const now = new Date()
  switch (key) {
    case 'month': return [new Date(now.getFullYear(), now.getMonth(), 1), now]
    case 'prev_month': return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
      new Date(now.getFullYear(), now.getMonth(), 1),
    ]
    case 'd30': return [new Date(+now - 30 * 86_400_000), now]
    case 'year': return [new Date(now.getFullYear(), 0, 1), now]
    case 'all': return [new Date(2000, 0, 1), now]
  }
}

/** Formulaire de depense. Brouillon local enregistre en une fois. */
function ExpenseForm({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState<Expense>(structuredClone(expense))
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) =>
    setDraft(e => ({ ...e, [k]: v }))

  return (
    <Modal
      open onClose={onClose} title={expense.label || 'Nouvelle dépense'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => {
            if (!draft.label.trim()) {
              toast({ tone: 'danger', title: 'Le libellé est obligatoire' })
              return
            }
            if (draft.amount <= 0) {
              toast({ tone: 'danger', title: 'Le montant doit être supérieur à zéro' })
              return
            }
            saveExpense(expense.id, draft)
            toast({ tone: 'success', title: 'Dépense enregistrée', message: draft.label })
            onClose()
          }}>Enregistrer</Button>
        </>
      }
    >
      <div className="sk-stack">
        <Field label="Libellé" required hint="Ex. Perles de tapioca — 5 kg">
          <Input value={draft.label} onChange={e => set('label', e.target.value)} />
        </Field>
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Montant (FCFA)" required>
            <Input
              type="number" value={draft.amount || ''}
              onChange={e => set('amount', Number(e.target.value))}
            />
          </Field>
          <Field label="Catégorie">
            <Select
              value={draft.category}
              onChange={e => set('category', e.target.value as ExpenseCategory)}
            >
              {Object.entries(EXPENSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Date de la dépense" hint="Et non la date de saisie.">
            <Input
              type="date" value={draft.spentAt.slice(0, 10)}
              onChange={e => set('spentAt', new Date(e.target.value).toISOString())}
            />
          </Field>
          <Field label="Fournisseur">
            <Input
              value={draft.supplier ?? ''} placeholder="Marché Dantokpa"
              onChange={e => set('supplier', e.target.value || undefined)}
            />
          </Field>
        </div>
        <Field label="N° de reçu" hint="Pour retrouver le justificatif papier.">
          <Input
            value={draft.receipt ?? ''}
            onChange={e => set('receipt', e.target.value || undefined)}
          />
        </Field>
        <Field label="Note">
          <Textarea
            value={draft.note ?? ''}
            onChange={e => set('note', e.target.value || undefined)}
          />
        </Field>
      </div>
    </Modal>
  )
}

export function ExpensesPage() {
  const d = useData()
  const toast = useToast()
  const [range, setRange] = useState<RangeKey>('month')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [confirmDel, setConfirmDel] = useState<Expense | null>(null)

  const [from, to] = rangeBounds(range)
  const result = useMemo(() => profitOverPeriod(from, to), [d, range])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.expenses
      .filter(e => {
        const t = new Date(e.spentAt).getTime()
        return t >= +from && t <= +to
      })
      .filter(e => category === 'all' || e.category === category)
      .filter(e => !q
        || e.label.toLowerCase().includes(q)
        || (e.supplier?.toLowerCase().includes(q) ?? false))
      .sort((a, b) => +new Date(b.spentAt) - +new Date(a.spentAt))
  }, [d.expenses, query, category, range])

  const pager = usePagination(filtered, 15)

  return (
    <>
      <PageHead
        title="Dépenses"
        subtitle="Ce que tu achètes : condiments, ingrédients, emballage, livraison. Le bénéfice se calcule à partir de ces montants."
        actions={
          <>
            {d.expenses.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportCsv('depenses.csv',
                filtered.map(e => ({
                  date: e.spentAt.slice(0, 10), libelle: e.label,
                  categorie: EXPENSE_LABELS[e.category], montant: e.amount,
                  fournisseur: e.supplier ?? '', recu: e.receipt ?? '',
                })))}>Exporter CSV</Button>
            )}
            <Button onClick={() => setEditing(createExpense())}>＋ Nouvelle dépense</Button>
          </>
        }
      />

      <div className="sk-row sk-row-wrap" style={{ marginBottom: 'var(--sk-space-6)' }}>
        {RANGES.map(r => (
          <Pill key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>
            {r.label}
          </Pill>
        ))}
      </div>

      {/* Le resultat de la periode : entrees, sorties, ce qui reste. */}
      <section className="sk-grid sk-grid-kpi" style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Kpi label="Chiffre d’affaires" value={formatAmount(result.revenue)} />
        <Kpi label="Dépenses" value={formatAmount(result.expenses)} />
        <Kpi
          label="Bénéfice"
          value={formatAmount(result.profit)}
          hint={result.profit < 0 ? 'Les dépenses dépassent les ventes.' : undefined}
        />
        <Kpi
          label="Marge"
          value={result.margin === null ? '—' : `${result.margin.toFixed(1)} %`}
          hint={result.margin === null ? 'Aucune vente sur la période.' : undefined}
        />
      </section>

      {result.byCategory.length > 0 && (
        <div style={{ marginBottom: 'var(--sk-space-6)' }}>
          <Card title="Répartition des dépenses">
            <div className="sk-stack sk-stack-sm">
              {result.byCategory.map(c => (
                <div key={c.category}>
                  <div className="sk-row sk-row-between">
                    <span className="sk-text-sm">{EXPENSE_LABELS[c.category]}</span>
                    <span className="sk-text-sm sk-numeric">
                      {formatAmount(c.amount)}
                      {' · '}
                      {((c.amount / result.expenses) * 100).toFixed(0)} %
                    </span>
                  </div>
                  <div style={{
                    height: 6, marginTop: 4, borderRadius: 3,
                    background: 'var(--sk-bg-surface-sunken)',
                  }}>
                    <div style={{
                      width: `${(c.amount / result.expenses) * 100}%`,
                      height: '100%', borderRadius: 3,
                      background: 'var(--sk-brand-500)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {d.expenses.length === 0 ? (
        <>
          <div style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Notice>
              Enregistre ici chaque achat — condiments, gobelets, ingrédients,
              carburant. Le bénéfice et la marge se calculent automatiquement
              à partir de ces montants et des ventes réelles.
            </Notice>
          </div>
          <Card padded={false}>
            <EmptyState
              icon="🧾" title="Aucune dépense enregistrée"
              text="Ajoute ta première dépense pour suivre ce que la boutique coûte réellement."
              action={<Button size="sm" onClick={() => setEditing(createExpense())}>＋ Nouvelle dépense</Button>}
            />
          </Card>
        </>
      ) : (
        <>
          <div className="sk-toolbar">
            <SearchInput
              value={query} onChange={v => { setQuery(v); pager.reset() }}
              placeholder="Libellé, fournisseur…"
            />
            <Select
              value={category} style={{ width: 'auto' }}
              onChange={e => setCategory(e.target.value as ExpenseCategory | 'all')}
            >
              <option value="all">Toutes les catégories</option>
              {Object.entries(EXPENSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon="🔍" title="Aucune dépense sur cette période"
                text="Change de période ou de catégorie pour élargir la recherche."
              />
            </Card>
          ) : (
            <div className="sk-table-wrap">
              <table className="sk-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Libellé</th><th>Catégorie</th>
                    <th>Fournisseur</th>
                    <th className="sk-table-numeric">Montant</th>
                    <th className="sk-table-actions" />
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map(e => (
                    <tr key={e.id}>
                      <td className="sk-text-xs sk-muted">{formatDate(e.spentAt)}</td>
                      <td>
                        <strong>{e.label}</strong>
                        {e.note && (
                          <p className="sk-text-xs sk-dim" style={{ margin: '2px 0 0' }}>{e.note}</p>
                        )}
                      </td>
                      <td><Badge tone="neutral">{EXPENSE_LABELS[e.category]}</Badge></td>
                      <td className="sk-text-sm sk-muted">{e.supplier ?? '—'}</td>
                      <td className="sk-table-numeric sk-numeric">{formatAmount(e.amount)}</td>
                      <td className="sk-table-actions">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDel(e)}>Supprimer</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination {...pager} onChange={pager.setPage} />
            </div>
          )}
        </>
      )}

      {editing && <ExpenseForm expense={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) {
            deleteExpense(confirmDel.id)
            toast({ tone: 'danger', title: 'Dépense supprimée' })
          }
        }}
        title={`Supprimer « ${confirmDel?.label} » ?`}
        message="Cette dépense ne sera plus comptée dans le calcul du bénéfice."
      />
    </>
  )
}

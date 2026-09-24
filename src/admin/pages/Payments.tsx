import { Icon } from '../Icon'
// Paiements : suivi des transactions par statut. Aucune donnee de carte
// n'est stockee — seuls l'identifiant de transaction et la reference du
// prestataire, conformement aux regles PCI.

import { useMemo, useState } from 'react'
import { PageHead } from '../AdminApp'
import { formatAmount, formatDateTime, useData } from '../store'
import type { PaymentStatus } from '../types'
import {
  Badge, Button, Card, EmptyState, Kpi, Notice, Pagination, Pill,
  SearchInput, exportCsv, usePagination,
} from '../ui'

const TONE: Record<PaymentStatus, string> = {
  initiated: 'info', pending: 'warning', succeeded: 'success',
  failed: 'danger', cancelled: 'neutral', refunded: 'neutral',
}
const LABEL: Record<PaymentStatus, string> = {
  initiated: 'Initié', pending: 'En attente', succeeded: 'Réussi',
  failed: 'Échoué', cancelled: 'Annulé', refunded: 'Remboursé',
}

export function PaymentsPage() {
  const d = useData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PaymentStatus>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.payments
      .filter(p => status === 'all' || p.status === status)
      .filter(p => !q || p.transactionId.toLowerCase().includes(q)
        || p.orderReference.toLowerCase().includes(q)
        || p.customerName.toLowerCase().includes(q))
  }, [d.payments, query, status])

  const pager = usePagination(filtered, 15)
  const sum = (st: PaymentStatus) =>
    d.payments.filter(p => p.status === st).reduce((s, p) => s + p.amount, 0)
  const count = (st: PaymentStatus) => d.payments.filter(p => p.status === st).length

  return (
    <>
      <PageHead
        title="Paiements"
        subtitle="Suivi de toutes les transactions. Les données bancaires sensibles ne sont jamais stockées."
        actions={d.payments.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportCsv('paiements.csv',
            d.payments.map(p => ({
              transaction: p.transactionId, commande: p.orderReference,
              client: p.customerName, montant: p.amount, moyen: p.method,
              statut: LABEL[p.status], date: p.createdAt, reference: p.providerRef ?? '',
            })))}>Exporter CSV</Button>
        )}
      />

      {d.payments.length === 0 ? (
        <>
          <div style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Notice tone="warning">
              <strong>Aucun prestataire de paiement connecté.</strong>
              <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>
                Pour encaisser en ligne au Bénin, il faudra intégrer un
                prestataire (Kkiapay, FedaPay ou CinetPay pour MTN MoMo, Moov
                Money et Celtiis Cash). Cette page affichera alors chaque
                transaction, y compris les échecs et leur message d’erreur.
              </p>
            </Notice>
          </div>
          <Card padded={false}>
            <EmptyState icon={<Icon name="payments" />} title="Aucune transaction" text="Les paiements apparaîtront ici dès qu’un prestataire sera branché." />
          </Card>
        </>
      ) : (
        <>
          <section className="sk-grid sk-grid-kpi" style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Kpi label="Encaissé" value={formatAmount(sum('succeeded'))} hint={`${count('succeeded')} transaction(s)`} />
            <Kpi label="En attente" value={formatAmount(sum('pending'))} hint={`${count('pending')} transaction(s)`} />
            <Kpi label="Échoué" value={formatAmount(sum('failed'))} hint={`${count('failed')} transaction(s)`} />
            <Kpi label="Remboursé" value={formatAmount(sum('refunded'))} hint={`${count('refunded')} transaction(s)`} />
          </section>

          <div className="sk-toolbar">
            <SearchInput value={query} onChange={v => { setQuery(v); pager.reset() }} placeholder="ID transaction, commande, client…" />
            <Pill active={status === 'all'} onClick={() => setStatus('all')}>Tous</Pill>
            {(['succeeded', 'pending', 'failed', 'refunded'] as PaymentStatus[]).map(s => (
              <Pill key={s} active={status === s} count={count(s)} onClick={() => setStatus(s)}>{LABEL[s]}</Pill>
            ))}
          </div>

          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr>
                  <th>Transaction</th><th>Commande</th><th>Client</th>
                  <th>Moyen</th><th>Statut</th>
                  <th className="sk-table-numeric">Montant</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map(p => (
                  <tr key={p.id}>
                    <td><code className="sk-text-xs">{p.transactionId}</code></td>
                    <td><strong>{p.orderReference}</strong></td>
                    <td>{p.customerName}</td>
                    <td className="sk-text-xs">{p.method}</td>
                    <td>
                      <Badge tone={TONE[p.status]} dot>{LABEL[p.status]}</Badge>
                      {p.errorMessage && (
                        <p className="sk-text-2xs" style={{ color: 'var(--sk-danger-fg)', margin: '3px 0 0' }}>
                          {p.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="sk-table-numeric sk-numeric">{formatAmount(p.amount)}</td>
                    <td className="sk-text-xs sk-dim">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...pager} onChange={pager.setPage} />
          </div>
        </>
      )}
    </>
  )
}

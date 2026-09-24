// Tunnel de conversion : de la visite a la commande confirmee. Chaque
// etape et chaque taux sont deduits des evenements enregistres.

import { useMemo } from 'react'
import { PageHead } from '../AdminApp'
import { formatNumber, formatRate, useData } from '../store'
import { Card, Kpi, Notice } from '../ui'
import type { AnalyticsEventName } from '../types'

const STEPS: { name: AnalyticsEventName | 'session'; label: string }[] = [
  { name: 'session', label: 'Visite du site' },
  { name: 'product_view', label: 'Consultation produit' },
  { name: 'add_to_cart', label: 'Ajout au panier' },
  { name: 'cart_open', label: 'Ouverture du panier' },
  { name: 'checkout_started', label: 'Début du checkout' },
  { name: 'payment_started', label: 'Paiement initié' },
  { name: 'payment_success', label: 'Paiement réussi' },
  { name: 'order_created', label: 'Commande confirmée' },
]

export function FunnelPage() {
  const d = useData()

  const f = useMemo(() => {
    const ev = (n: string) => d.events.filter(e => e.name === n).length
    const counts = STEPS.map(s => ({
      label: s.label,
      value: s.name === 'session' ? d.sessions.length : ev(s.name),
    }))
    const top = counts[0].value
    return {
      counts,
      top,
      addRate: formatRate(ev('add_to_cart'), d.sessions.length),
      cartAbandon: formatRate(
        Math.max(0, ev('add_to_cart') - ev('checkout_started')), ev('add_to_cart')),
      checkoutAbandon: formatRate(
        Math.max(0, ev('checkout_started') - ev('payment_success')), ev('checkout_started')),
      conversion: formatRate(ev('order_created'), d.sessions.length),
      removals: ev('remove_from_cart'),
      hasData: d.events.length > 0 || d.sessions.length > 0,
    }
  }, [d])

  return (
    <>
      <PageHead
        title="Panier & conversion"
        subtitle="Parcours réel des visiteurs, étape par étape, avec les taux d’abandon."
      />

      {!f.hasData && (
        <div style={{ marginBottom: 'var(--sk-space-6)' }}>
          <Notice tone="warning">
            <strong>Aucun événement enregistré.</strong>
            <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>
              Le tunnel se construira automatiquement dès que le site
              enverra ses événements. Les taux affichent « — » plutôt que
              « 0 % », qui laisserait croire à un échec réel.
            </p>
          </Notice>
        </div>
      )}

      <section className="sk-grid sk-grid-kpi" style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Kpi label="Taux d’ajout au panier" value={f.hasData ? f.addRate : '—'} />
        <Kpi label="Abandon de panier" value={f.hasData ? f.cartAbandon : '—'} />
        <Kpi label="Abandon de checkout" value={f.hasData ? f.checkoutAbandon : '—'} />
        <Kpi label="Taux de conversion" value={f.hasData ? f.conversion : '—'} />
      </section>

      <Card title="Entonnoir">
        <div className="sk-stack sk-stack-sm">
          {f.counts.map((c, i) => {
            const pct = f.top > 0 ? (c.value / f.top) * 100 : 0
            const prev = i > 0 ? f.counts[i - 1].value : c.value
            const drop = prev > 0 ? ((prev - c.value) / prev) * 100 : 0
            return (
              <div key={c.label}>
                <div className="sk-row sk-row-between">
                  <span className="sk-text-sm" style={{ fontWeight: 600 }}>{c.label}</span>
                  <span className="sk-text-sm sk-numeric">
                    {f.hasData ? formatNumber(c.value) : '—'}
                    {i > 0 && drop > 0 && f.hasData && (
                      <span className="sk-text-xs" style={{ color: 'var(--sk-danger-fg)', marginLeft: 8 }}>
                        −{drop.toFixed(0)} %
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ height: 24, background: 'var(--sk-bg-surface-sunken)', borderRadius: 'var(--sk-radius-sm)', marginTop: 4 }}>
                  <div style={{
                    width: `${Math.max(pct, f.hasData && c.value > 0 ? 2 : 0)}%`,
                    height: '100%',
                    background: `var(--sk-brand-${Math.max(200, 500 - i * 40)})`,
                    borderRadius: 'var(--sk-radius-sm)',
                    transition: 'width var(--sk-duration-normal) var(--sk-ease-out)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
        {f.removals > 0 && (
          <p className="sk-text-xs sk-muted" style={{ marginTop: 'var(--sk-space-4)' }}>
            {formatNumber(f.removals)} suppression(s) d’article du panier sur la période.
          </p>
        )}
      </Card>
    </>
  )
}

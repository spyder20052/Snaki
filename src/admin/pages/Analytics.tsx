import { Icon } from '../Icon'
// Analytics : visiteurs, sessions, pages, appareils, sources. Tout est
// calcule depuis les evenements reellement enregistres.

import { useMemo } from 'react'
import { PageHead } from '../AdminApp'
import { formatNumber, useData } from '../store'
import { Card, EmptyState, Kpi, Notice } from '../ui'

/** Repartition en barres horizontales : plus lisible qu'un camembert pour
 *  comparer des valeurs proches. */
function Breakdown({ rows }: { rows: { label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) return <p className="sk-text-sm sk-dim">Aucune donnée.</p>
  return (
    <div className="sk-stack sk-stack-sm">
      {rows.filter(r => r.value > 0).sort((a, b) => b.value - a.value).map(r => (
        <div key={r.label}>
          <div className="sk-row sk-row-between">
            <span className="sk-text-sm">{r.label}</span>
            <span className="sk-text-sm sk-numeric">
              {formatNumber(r.value)} · {((r.value / total) * 100).toFixed(0)} %
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--sk-bg-surface-sunken)', borderRadius: 3, marginTop: 4 }}>
            <div style={{
              width: `${(r.value / total) * 100}%`, height: '100%',
              background: 'var(--sk-brand-500)', borderRadius: 3,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const d = useData()

  const a = useMemo(() => {
    const s = d.sessions
    const e = d.events
    const byDevice = (dev: string) => s.filter(x => x.device === dev).length
    const pages = new Map<string, number>()
    for (const ev of e) {
      if (ev.name === 'page_view' && ev.path) pages.set(ev.path, (pages.get(ev.path) ?? 0) + 1)
    }
    const sources = new Map<string, number>()
    for (const x of s) sources.set(x.source || 'Direct', (sources.get(x.source || 'Direct') ?? 0) + 1)
    const countries = new Map<string, number>()
    for (const x of s) if (x.country) countries.set(x.country, (countries.get(x.country) ?? 0) + 1)

    return {
      sessions: s.length,
      pageViews: e.filter(x => x.name === 'page_view').length,
      unique: new Set(s.map(x => x.id)).size,
      avgPages: s.length ? (s.reduce((t, x) => t + x.pageViews, 0) / s.length).toFixed(1) : '—',
      devices: [
        { label: 'Mobile', value: byDevice('mobile') },
        { label: 'Desktop', value: byDevice('desktop') },
        { label: 'Tablette', value: byDevice('tablet') },
      ],
      topPages: [...pages.entries()].map(([label, value]) => ({ label, value })),
      sources: [...sources.entries()].map(([label, value]) => ({ label, value })),
      countries: [...countries.entries()].map(([label, value]) => ({ label, value })),
      hasData: s.length > 0 || e.length > 0,
    }
  }, [d])

  return (
    <>
      <PageHead
        title="Analytics"
        subtitle="Fréquentation du site, calculée uniquement à partir des événements enregistrés."
      />

      {!a.hasData && (
        <div style={{ marginBottom: 'var(--sk-space-6)' }}>
          <Notice tone="warning">
            <strong>Le tracking n’est pas encore actif.</strong>
            <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>
              Le site public n’enregistre aujourd’hui aucun événement de
              navigation. Une fois le tracking branché (page_view,
              product_view, add_to_cart…), ces indicateurs se rempliront.
              Aucune donnée personnelle ne sera collectée : ni adresse IP, ni
              identifiant publicitaire — uniquement des compteurs anonymes.
            </p>
          </Notice>
        </div>
      )}

      <section className="sk-grid sk-grid-kpi" style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Kpi label="Sessions" value={a.hasData ? formatNumber(a.sessions) : '—'} />
        <Kpi label="Visiteurs uniques" value={a.hasData ? formatNumber(a.unique) : '—'} />
        <Kpi label="Pages vues" value={a.hasData ? formatNumber(a.pageViews) : '—'} />
        <Kpi label="Pages / session" value={a.hasData ? a.avgPages : '—'} />
      </section>

      <div className="sk-grid sk-grid-2">
        <Card title="Appareils"><Breakdown rows={a.devices} /></Card>
        <Card title="Sources de trafic"><Breakdown rows={a.sources} /></Card>
        <Card title="Pages les plus consultées">
          {a.topPages.length === 0
            ? <EmptyState icon={<Icon name="content" />} title="Aucune page vue" />
            : <Breakdown rows={a.topPages} />}
        </Card>
        <Card title="Pays">
          {a.countries.length === 0
            ? <p className="sk-text-sm sk-dim">Aucune donnée géographique collectée.</p>
            : <Breakdown rows={a.countries} />}
        </Card>
      </div>
    </>
  )
}

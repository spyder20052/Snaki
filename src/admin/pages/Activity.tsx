import { Icon } from '../Icon'
// Journal d'activite : qui a fait quoi, et quand. Alimente automatiquement
// par toutes les ecritures du store.

import { useMemo, useState } from 'react'
import { PageHead } from '../AdminApp'
import { formatDateTime, useData } from '../store'
import {
  Badge, Card, EmptyState, Pagination, Pill, SearchInput, usePagination,
} from '../ui'

const ACTION_TONE = {
  create: 'success', update: 'info', delete: 'danger',
  archive: 'neutral', login: 'brand', status: 'warning',
} as const
const ACTION_LABEL = {
  create: 'Création', update: 'Modification', delete: 'Suppression',
  archive: 'Archivage', login: 'Connexion', status: 'Statut',
} as const

export function ActivityPage() {
  const d = useData()
  const [query, setQuery] = useState('')
  const [entity, setEntity] = useState('all')

  const entities = useMemo(
    () => [...new Set(d.logs.map(l => l.entity))].sort(), [d.logs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.logs
      .filter(l => entity === 'all' || l.entity === entity)
      .filter(l => !q || l.message.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q))
  }, [d.logs, query, entity])

  const pager = usePagination(filtered, 20)

  return (
    <>
      <PageHead
        title="Journal d’activité"
        subtitle="Historique des actions administratives, pour savoir qui a modifié quoi et quand."
      />

      {d.logs.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Icon name="activity" />} title="Aucune action enregistrée"
            text="Le journal se remplit automatiquement dès la première modification dans le dashboard."
          />
        </Card>
      ) : (
        <>
          <div className="sk-toolbar">
            <SearchInput value={query} onChange={v => { setQuery(v); pager.reset() }} placeholder="Rechercher dans le journal…" />
            <Pill active={entity === 'all'} count={d.logs.length} onClick={() => setEntity('all')}>Tout</Pill>
            {entities.map(e => (
              <Pill key={e} active={entity === e}
                count={d.logs.filter(l => l.entity === e).length}
                onClick={() => setEntity(e)}>{e}</Pill>
            ))}
          </div>
          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr><th>Action</th><th>Description</th><th>Auteur</th><th>Date</th></tr>
              </thead>
              <tbody>
                {pager.slice.map(l => (
                  <tr key={l.id}>
                    <td><Badge tone={ACTION_TONE[l.action]}>{ACTION_LABEL[l.action]}</Badge></td>
                    <td className="sk-text-sm">{l.message}</td>
                    <td className="sk-text-xs sk-muted">{l.actor}</td>
                    <td className="sk-text-xs sk-dim">{formatDateTime(l.at)}</td>
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

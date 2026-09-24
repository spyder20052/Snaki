import { Icon } from '../Icon'
// Notifications du dashboard : nouvelle commande, paiement echoue,
// annulation, rupture, erreur systeme.

import { PageHead } from '../AdminApp'
import { formatDateTime, markNotificationsRead, useData } from '../store'
import { Badge, Button, Card, EmptyState, Notice, useToast } from '../ui'

const TONE = {
  order: 'brand', payment: 'success', payment_failed: 'danger',
  cancel: 'warning', stock: 'warning', system: 'danger',
} as const

export function NotificationsPage() {
  const d = useData()
  const toast = useToast()
  const unread = d.notifications.filter(n => !n.read).length

  return (
    <>
      <PageHead
        title="Notifications"
        subtitle="Alertes du dashboard : commandes, paiements, ruptures, erreurs."
        actions={unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => {
            markNotificationsRead()
            toast({ tone: 'info', title: 'Notifications marquées comme lues' })
          }}>Tout marquer comme lu</Button>
        )}
      />

      {d.notifications.length === 0 ? (
        <>
          <div style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Notice>
              Les alertes se déclencheront automatiquement à la première
              commande. L’envoi par e-mail ou WhatsApp pourra être ajouté
              ensuite selon les intégrations disponibles.
            </Notice>
          </div>
          <Card padded={false}>
            <EmptyState icon={<Icon name="notifications" />} title="Aucune notification" text="Tout est calme pour le moment." />
          </Card>
        </>
      ) : (
        <div className="sk-stack">
          {d.notifications.map(n => (
            <Card key={n.id}>
              <div className="sk-row sk-row-between">
                <div>
                  <div className="sk-row">
                    <Badge tone={TONE[n.kind]} dot>{n.kind}</Badge>
                    <strong className="sk-text-sm">{n.title}</strong>
                    {!n.read && <Badge tone="brand">Nouveau</Badge>}
                  </div>
                  <p className="sk-text-sm sk-muted" style={{ marginTop: 6 }}>{n.message}</p>
                </div>
                <span className="sk-text-xs sk-dim">{formatDateTime(n.at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

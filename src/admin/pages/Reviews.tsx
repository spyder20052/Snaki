import { Icon } from '../Icon'
// Avis et temoignages : moderation avant publication sur le site public.

import { useState } from 'react'
import { PageHead } from '../AdminApp'
import { formatDate, replyToReview, setReviewStatus, useData } from '../store'
import {
  Badge, Button, Card, EmptyState, Field, Modal, Notice, Pill, Textarea, useToast,
} from '../ui'

export function ReviewsPage() {
  const d = useData()
  const toast = useToast()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all')
  const [replying, setReplying] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const list = d.reviews.filter(r => filter === 'all' || r.status === filter)
  const count = (s: string) => d.reviews.filter(r => r.status === s).length

  return (
    <>
      <PageHead
        title="Avis"
        subtitle="Modère les témoignages avant leur publication sur le site public."
      />

      {d.reviews.length === 0 ? (
        <>
          <div style={{ marginBottom: 'var(--sk-space-6)' }}>
            <Notice tone="warning">
              <strong>Aucun avis collecté.</strong>
              <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>
                Le site public n’a pas encore de formulaire d’avis. Une fois en
                place, chaque avis arrivera ici en attente de modération.
              </p>
            </Notice>
          </div>
          <Card padded={false}>
            <EmptyState icon={<Icon name="reviews" />} title="Aucun avis" text="Les avis clients apparaîtront ici pour modération." />
          </Card>
        </>
      ) : (
        <>
          <div className="sk-toolbar">
            <Pill active={filter === 'all'} count={d.reviews.length} onClick={() => setFilter('all')}>Tous</Pill>
            <Pill active={filter === 'pending'} count={count('pending')} onClick={() => setFilter('pending')}>En attente</Pill>
            <Pill active={filter === 'approved'} count={count('approved')} onClick={() => setFilter('approved')}>Approuvés</Pill>
            <Pill active={filter === 'hidden'} count={count('hidden')} onClick={() => setFilter('hidden')}>Masqués</Pill>
          </div>
          <div className="sk-stack">
            {list.map(r => (
              <Card key={r.id}>
                <div className="sk-row sk-row-between">
                  <div>
                    <strong>{r.customerName}</strong>
                    <span className="sk-text-sm" style={{ marginLeft: 8 }}>
                      <span aria-label={`${r.rating} sur 5`} style={{ display: 'inline-flex', gap: 2 }}>
                        {Array.from({ length: 5 }, (_, i) => <span key={i} style={{ opacity: i < r.rating ? 1 : .2 }}><Icon name="reviews" size={14} /></span>)}
                      </span>
                    </span>
                    <span className="sk-text-xs sk-dim" style={{ marginLeft: 8 }}>{formatDate(r.createdAt)}</span>
                  </div>
                  <Badge tone={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'neutral'}>
                    {r.status === 'approved' ? 'Approuvé' : r.status === 'pending' ? 'En attente' : 'Masqué'}
                  </Badge>
                </div>
                <p className="sk-text-sm" style={{ marginTop: 10 }}>{r.comment}</p>
                {r.reply && (
                  <div style={{
                    marginTop: 10, padding: 'var(--sk-space-3)',
                    background: 'var(--sk-bg-surface-sunken)',
                    borderRadius: 'var(--sk-radius-sm)',
                  }}>
                    <p className="sk-text-2xs sk-eyebrow">Réponse Snaki</p>
                    <p className="sk-text-sm">{r.reply}</p>
                  </div>
                )}
                <div className="sk-row" style={{ marginTop: 12 }}>
                  <Button size="sm" variant="outline" onClick={() => {
                    setReviewStatus(r.id, 'approved'); toast({ tone: 'success', title: 'Avis approuvé' })
                  }}>Approuver</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setReviewStatus(r.id, 'hidden'); toast({ tone: 'info', title: 'Avis masqué' })
                  }}>Masquer</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setReplying(r.id); setReply(r.reply ?? '') }}>
                    Répondre
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {replying && (
        <Modal open onClose={() => setReplying(null)} title="Répondre à l’avis"
          footer={<>
            <Button variant="ghost" onClick={() => setReplying(null)}>Annuler</Button>
            <Button onClick={() => {
              replyToReview(replying, reply)
              toast({ tone: 'success', title: 'Réponse enregistrée' })
              setReplying(null)
            }}>Publier la réponse</Button>
          </>}>
          <Field label="Réponse publique">
            <Textarea value={reply} onChange={e => setReply(e.target.value)} />
          </Field>
        </Modal>
      )}
    </>
  )
}

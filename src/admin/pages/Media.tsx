import { Icon } from '../Icon'
// Mediatheque : import, apercu, recherche, suppression. Les images du site
// public sont listees en lecture seule car elles vivent dans le code
// (import Vite) et non encore dans un stockage distant.

import { useMemo, useState } from 'react'
import { PageHead } from '../AdminApp'
import { addMedia, deleteMedia, useData } from '../store'
import type { MediaAsset } from '../types'
import {
  Button, Card, ConfirmDialog, EmptyState, Notice, SearchInput, useToast,
} from '../ui'

const kb = (n: number) => n < 1024 ? `${n} o` : n < 1_048_576 ? `${(n / 1024).toFixed(0)} Ko` : `${(n / 1_048_576).toFixed(1)} Mo`

export function MediaPage() {
  const d = useData()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<MediaAsset | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.media.filter(m => !q || m.name.toLowerCase().includes(q))
  }, [d.media, query])

  /** Import local : lit le fichier en base64 pour l'apercu. Avec Supabase
   *  Storage, ce sera un envoi reel et l'URL renvoyee par le bucket. */
  const onFiles = (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          addMedia({
            name: file.name, url: String(reader.result), size: file.size,
            width: img.width, height: img.height,
            format: file.type.split('/')[1] ?? 'inconnu', usedIn: [],
          })
          toast({ tone: 'success', title: 'Média importé', message: file.name })
        }
        img.src = String(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
      <PageHead
        title="Médiathèque"
        subtitle="Centralise les visuels du site : import, aperçu, réutilisation."
        actions={
          <label className="sk-btn sk-btn-primary" style={{ cursor: 'pointer' }}>
            ＋ Importer
            <input type="file" accept="image/*" multiple hidden
              onChange={e => onFiles(e.target.files)} />
          </label>
        }
      />

      <div style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Notice tone="warning">
          Les images importées sont enregistrées dans la médiathèque de la base. Privilégiez des fichiers compressés.
        </Notice>
      </div>

      <div className="sk-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un média…" />
      </div>

      {filtered.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Icon name="media" />}
            title={query ? 'Aucun résultat' : 'Médiathèque vide'}
            text={query ? 'Aucun média ne correspond.' : 'Importe tes premières images de boissons.'}
          />
        </Card>
      ) : (
        <div className="sk-grid sk-grid-cards">
          {filtered.map(m => (
            <Card key={m.id} padded={false}>
              <div style={{
                height: 150, background: 'var(--sk-bg-surface-sunken)',
                display: 'grid', placeItems: 'center', overflow: 'hidden',
              }}>
                <img src={m.url} alt={m.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div className="sk-card-body">
                <p className="sk-text-sm" style={{ fontWeight: 600, wordBreak: 'break-all' }}>{m.name}</p>
                <p className="sk-text-xs sk-dim" style={{ margin: '4px 0 0' }}>
                  {m.width}×{m.height} · {kb(m.size)} · {m.format}
                </p>
                {m.usedIn.length > 0 && (
                  <p className="sk-text-2xs sk-muted" style={{ marginTop: 6 }}>
                    Utilisé dans : {m.usedIn.join(', ')}
                  </p>
                )}
                <div className="sk-row" style={{ marginTop: 10 }}>
                  <Button variant="ghost" size="sm"
                    onClick={() => { navigator.clipboard?.writeText(m.name); toast({ tone: 'info', title: 'Nom copié' }) }}>
                    Copier
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDel(m)}>Supprimer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) { deleteMedia(confirmDel.id); toast({ tone: 'danger', title: 'Média supprimé' }) }
        }}
        title={`Supprimer « ${confirmDel?.name} » ?`}
        message="Si ce média est utilisé sur le site, l’emplacement deviendra vide."
      />
    </>
  )
}

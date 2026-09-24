// Zones de livraison : ce sont les 5 zones reellement affichees sur la
// carte du site. Une zone indisponible ne doit jamais etre proposee au
// client lors de la commande.

import { useState } from 'react'
import { PageHead } from '../AdminApp'
import { createZone, deleteZone, saveZone, useData } from '../store'
import {
  Badge, Button, Card, ConfirmDialog, Input, Notice, Switch, useToast,
} from '../ui'
import type { DeliveryZone } from '../types'

export function ZonesPage() {
  const d = useData()
  const toast = useToast()
  const [name, setName] = useState('')
  const [confirmDel, setConfirmDel] = useState<DeliveryZone | null>(null)

  const sorted = [...d.zones].sort((a, b) => a.priority - b.priority)

  return (
    <>
      <PageHead
        title="Zones de livraison"
        subtitle="Les zones réellement desservies. Le site ne proposera jamais une zone marquée indisponible."
      />

      <div style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Notice>
          Ces cinq zones correspondent à celles affichées sur la carte du site
          public : Cotonou, Fidjrossè, Godomey, Calavi et Hêvié.
        </Notice>
      </div>

      <Card title="Nouvelle zone">
        <div className="sk-row">
          <Input value={name} placeholder="Ex. Akpakpa"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) {
                createZone(name.trim()); setName('')
                toast({ tone: 'success', title: 'Zone créée' })
              }
            }} />
          <Button onClick={() => {
            if (!name.trim()) return
            createZone(name.trim()); setName('')
            toast({ tone: 'success', title: 'Zone créée' })
          }}>Créer</Button>
        </div>
      </Card>

      <div className="sk-table-wrap" style={{ marginTop: 'var(--sk-space-6)' }}>
        <table className="sk-table">
          <thead>
            <tr>
              <th>Zone</th><th className="sk-table-numeric">Frais</th>
              <th className="sk-table-numeric">Minimum</th><th>Délai</th>
              <th>Disponible</th><th className="sk-table-actions" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(z => (
              <tr key={z.id}>
                <td>
                  <strong>{z.name}</strong>
                  {!z.available && <> <Badge tone="danger">Non desservie</Badge></>}
                </td>
                <td className="sk-table-numeric">
                  <Input type="number" value={z.fee} style={{ width: 110, textAlign: 'right' }}
                    onChange={e => saveZone(z.id, { fee: Number(e.target.value) })} />
                </td>
                <td className="sk-table-numeric">
                  <Input type="number" value={z.minOrder} style={{ width: 110, textAlign: 'right' }}
                    onChange={e => saveZone(z.id, { minOrder: Number(e.target.value) })} />
                </td>
                <td>
                  <Input value={z.eta ?? ''} placeholder="25–40 min" style={{ width: 130 }}
                    onChange={e => saveZone(z.id, { eta: e.target.value })} />
                </td>
                <td>
                  <Switch checked={z.available} onChange={v => {
                    saveZone(z.id, { available: v })
                    toast({ tone: 'info', title: v ? 'Zone activée' : 'Zone désactivée', message: z.name })
                  }} />
                </td>
                <td className="sk-table-actions">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDel(z)}>Supprimer</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) { deleteZone(confirmDel.id); toast({ tone: 'danger', title: 'Zone supprimée' }) }
        }}
        title={`Supprimer « ${confirmDel?.name} » ?`}
        message="Préfère la désactiver si des commandes passées y font référence."
      />
    </>
  )
}

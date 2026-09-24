import { Icon } from '../Icon'
// Promotions : codes promo, remises fixes ou en pourcentage, livraison
// offerte, avec bornes de validite et plafond d'utilisation.

import { useState } from 'react'
import { PageHead } from '../AdminApp'
import { createPromotion, deletePromotion, formatAmount, savePromotion, useData } from '../store'
import type { Promotion } from '../types'
import {
  Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, Input,
  Modal, Select, Switch, useToast,
} from '../ui'

const KIND_LABEL = { percent: 'Pourcentage', fixed: 'Montant fixe', free_delivery: 'Livraison offerte' } as const

export function PromotionsPage() {
  const d = useData()
  const toast = useToast()
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [confirmDel, setConfirmDel] = useState<Promotion | null>(null)

  return (
    <>
      <PageHead
        title="Promotions"
        subtitle="Crée des codes promo avec leurs conditions. Un code inactif n’est jamais accepté sur le site."
        actions={<Button onClick={() => setEditing(createPromotion())}>＋ Nouveau code</Button>}
      />

      {d.promotions.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Icon name="promotions" />} title="Aucune promotion"
            text="Crée un code promo : remise en pourcentage, montant fixe ou livraison offerte."
            action={<Button size="sm" onClick={() => setEditing(createPromotion())}>＋ Nouveau code</Button>}
          />
        </Card>
      ) : (
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>Code</th><th>Type</th><th>Valeur</th><th>Validité</th>
                <th className="sk-table-numeric">Utilisations</th><th>Actif</th>
                <th className="sk-table-actions" />
              </tr>
            </thead>
            <tbody>
              {d.promotions.map(p => (
                <tr key={p.id}>
                  <td><code style={{ fontWeight: 700 }}>{p.code}</code></td>
                  <td className="sk-text-sm">{KIND_LABEL[p.kind]}</td>
                  <td className="sk-numeric">
                    {p.kind === 'percent' ? `${p.value} %`
                      : p.kind === 'fixed' ? formatAmount(p.value) : '—'}
                  </td>
                  <td className="sk-text-xs sk-muted">
                    {p.startsAt ? new Date(p.startsAt).toLocaleDateString('fr-FR') : '—'}
                    {' → '}
                    {p.endsAt ? new Date(p.endsAt).toLocaleDateString('fr-FR') : '∞'}
                  </td>
                  <td className="sk-table-numeric sk-numeric">
                    {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ''}
                  </td>
                  <td>
                    <Switch checked={p.active} onChange={v => {
                      savePromotion(p.id, { active: v })
                      toast({ tone: 'info', title: v ? 'Code activé' : 'Code désactivé' })
                    }} />
                  </td>
                  <td className="sk-table-actions">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Modifier</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDel(p)}>Supprimer</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PromoForm promo={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) { deletePromotion(confirmDel.id); toast({ tone: 'danger', title: 'Code supprimé' }) }
        }}
        title={`Supprimer « ${confirmDel?.code} » ?`}
        message="Le code ne sera plus utilisable. Les commandes qui en ont bénéficié gardent leur remise."
      />
    </>
  )
}

function PromoForm({ promo, onClose }: { promo: Promotion; onClose: () => void }) {
  const d = useData()
  const toast = useToast()
  const [f, setF] = useState(structuredClone(promo))
  const set = <K extends keyof Promotion>(k: K, v: Promotion[K]) => setF(p => ({ ...p, [k]: v }))

  return (
    <Modal open onClose={onClose} title={`Code ${f.code}`} wide
      footer={<>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={() => {
          savePromotion(promo.id, { ...f, code: f.code.toUpperCase() })
          toast({ tone: 'success', title: 'Promotion enregistrée' })
          onClose()
        }}>Enregistrer</Button>
      </>}>
      <div className="sk-stack">
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Code" required hint="Saisi par le client.">
            <Input value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Type">
            <Select value={f.kind} onChange={e => set('kind', e.target.value as Promotion['kind'])}>
              <option value="percent">Pourcentage</option>
              <option value="fixed">Montant fixe</option>
              <option value="free_delivery">Livraison offerte</option>
            </Select>
          </Field>
          <Field label={f.kind === 'percent' ? 'Remise (%)' : 'Remise (FCFA)'}>
            <Input type="number" value={f.value} disabled={f.kind === 'free_delivery'}
              onChange={e => set('value', Number(e.target.value))} />
          </Field>
        </div>
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Début"><Input type="date"
            value={f.startsAt?.slice(0, 10) ?? ''}
            onChange={e => set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
          <Field label="Fin"><Input type="date"
            value={f.endsAt?.slice(0, 10) ?? ''}
            onChange={e => set('endsAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></Field>
        </div>
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Utilisations maximales" hint="Vide = illimité.">
            <Input type="number" value={f.maxUses ?? ''}
              onChange={e => set('maxUses', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Commande minimum (FCFA)">
            <Input type="number" value={f.minOrder ?? ''}
              onChange={e => set('minOrder', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
        </div>
        <Field label="Boissons concernées" hint="Aucune sélection = toutes les boissons.">
          <div className="sk-stack sk-stack-sm">
            {d.products.map(p => (
              <Checkbox key={p.id} label={p.name}
                checked={f.productIds.includes(p.id)}
                onChange={v => set('productIds', v
                  ? [...f.productIds, p.id]
                  : f.productIds.filter(x => x !== p.id))} />
            ))}
          </div>
        </Field>
        <Switch checked={f.oncePerCustomer} onChange={v => set('oncePerCustomer', v)}
          label="Une seule utilisation par client" />
        <Switch checked={f.active} onChange={v => set('active', v)} label="Code actif" />
      </div>
    </Modal>
  )
}

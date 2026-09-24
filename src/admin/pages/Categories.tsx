import { Icon } from '../Icon'
// Categories et menus : creation, renommage, image, ordre par glisser-
// deposer, masquage, archivage, suppression.

import { useState } from 'react'
import { PageHead } from '../AdminApp'
import {
  createCategory, deleteCategory, reorderCategories, saveCategory, useData,
} from '../store'
import type { Category } from '../types'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal,
  Switch, Textarea, useDragOrder, useToast,
} from '../ui'

export function CategoriesPage() {
  const d = useData()
  const toast = useToast()
  const [editing, setEditing] = useState<Category | null>(null)
  const [confirmDel, setConfirmDel] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')

  const sorted = [...d.categories].sort((a, b) => a.position - b.position)
  const { rowProps } = useDragOrder(sorted, reorderCategories)

  const add = () => {
    const name = newName.trim()
    if (!name) return
    createCategory(name)
    setNewName('')
    toast({ tone: 'success', title: 'Catégorie créée', message: name })
  }

  return (
    <>
      <PageHead
        title="Catégories"
        subtitle="Organise le catalogue. L’ordre défini ici est celui d’affichage sur le site public — glisse les lignes pour le modifier."
      />

      <Card title="Nouvelle catégorie">
        <div className="sk-row">
          <Input
            value={newName} placeholder="Ex. Smoothies"
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
          />
          <Button onClick={add}>Créer</Button>
        </div>
      </Card>

      <div style={{ marginTop: 'var(--sk-space-6)' }}>
        {sorted.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon={<Icon name="categories" />} title="Aucune catégorie" text="Crée une première catégorie pour ranger tes boissons." />
          </Card>
        ) : (
          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }} title="Glisser pour réordonner">⇅</th>
                  <th>Catégorie</th>
                  <th>Slug</th>
                  <th className="sk-table-numeric">Boissons</th>
                  <th>Visible</th>
                  <th className="sk-table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => {
                  const count = d.products.filter(p => p.categoryId === c.id).length
                  return (
                    <tr key={c.id} {...rowProps(c.id)}>
                      <td className="sk-drag-handle" title="Glisser pour réordonner">⋮⋮</td>
                      <td>
                        <strong>{c.name}</strong>
                        {c.archived && <> <Badge tone="neutral">Archivée</Badge></>}
                        {c.description && (
                          <p className="sk-text-xs sk-dim" style={{ margin: '2px 0 0' }}>{c.description}</p>
                        )}
                      </td>
                      <td className="sk-text-xs sk-dim"><code>{c.slug}</code></td>
                      <td className="sk-table-numeric sk-numeric">{count}</td>
                      <td>
                        <Switch
                          checked={c.visible}
                          onChange={v => {
                            saveCategory(c.id, { visible: v })
                            toast({ tone: 'info', title: v ? 'Catégorie affichée' : 'Catégorie masquée' })
                          }}
                        />
                      </td>
                      <td className="sk-table-actions">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDel(c)}>Supprimer</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CategoryForm category={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) {
            deleteCategory(confirmDel.id)
            toast({ tone: 'danger', title: 'Catégorie supprimée' })
          }
        }}
        title={`Supprimer « ${confirmDel?.name} » ?`}
        message="Les boissons de cette catégorie ne seront pas supprimées : elles deviendront simplement sans catégorie."
      />
    </>
  )
}

function CategoryForm({ category, onClose }: { category: Category; onClose: () => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState(structuredClone(category))
  return (
    <Modal
      open onClose={onClose} title={`Modifier « ${category.name} »`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => {
            saveCategory(category.id, draft)
            toast({ tone: 'success', title: 'Catégorie enregistrée' })
            onClose()
          }}>Enregistrer</Button>
        </>
      }
    >
      <div className="sk-stack">
        <Field label="Nom" required>
          <Input value={draft.name} onChange={e => setDraft(c => ({ ...c, name: e.target.value }))} />
        </Field>
        <Field label="Slug">
          <Input value={draft.slug} onChange={e => setDraft(c => ({ ...c, slug: e.target.value }))} />
        </Field>
        <Field label="Description">
          <Textarea
            value={draft.description ?? ''}
            onChange={e => setDraft(c => ({ ...c, description: e.target.value }))}
          />
        </Field>
        <Field label="Image" hint="Nom du fichier dans la médiathèque.">
          <Input
            value={draft.image ?? ''}
            onChange={e => setDraft(c => ({ ...c, image: e.target.value }))}
          />
        </Field>
        <Switch
          checked={draft.visible}
          onChange={v => setDraft(c => ({ ...c, visible: v }))}
          label="Visible sur le site public"
        />
        <Switch
          checked={draft.archived}
          onChange={v => setDraft(c => ({ ...c, archived: v }))}
          label="Archivée"
        />
      </div>
    </Modal>
  )
}

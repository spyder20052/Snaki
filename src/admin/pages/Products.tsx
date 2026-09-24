import { Icon } from '../Icon'
// Gestion des boissons : la page la plus complete du dashboard, car elle
// pilote de vraies donnees (les 6 boissons du site public).
//
// Toutes les actions demandees sont la : creer, modifier, dupliquer,
// archiver, masquer, remettre en ligne, marquer nouveaute / populaire /
// vedette, reordonner par glisser-deposer.

import { useMemo, useState } from 'react'
import { PageHead } from '../AdminApp'
import {
  archiveProduct, createProduct, deleteProduct, duplicateProduct,
  formatAmount, reorderProducts, saveProduct, useData,
} from '../store'
import type { Product, VariantGroup } from '../types'
import {
  Button, Card, Checkbox, ConfirmDialog, Dropdown, DropdownItem,
  EmptyState, Field, Input, Modal, Pagination, Pill, SearchInput, Select,
  SortHeader, StatusSelect, Switch, Tag, Textarea, exportCsv, usePagination,
  useDragOrder, useSort, useToast,
} from '../ui'

const STATUS_TONE = { active: 'success', hidden: 'warning', archived: 'neutral' } as const
const STATUS_LABEL = { active: 'En ligne', hidden: 'Masquée', archived: 'Archivée' } as const
/** Ordre d'affichage dans le selecteur de statut. */
const STATUS_OPTIONS: { value: Product['status']; label: string }[] = [
  { value: 'active', label: 'En ligne' },
  { value: 'hidden', label: 'Masquée' },
  { value: 'archived', label: 'Archivée' },
]

/** Formulaire de boisson. Un brouillon local est modifie puis enregistre en
 *  une fois : on evite d'ecrire dans le store a chaque frappe. */
function ProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const d = useData()
  const toast = useToast()
  const [draft, setDraft] = useState<Product>(structuredClone(product))
  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setDraft(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!draft.name.trim()) {
      toast({ tone: 'danger', title: 'Nom obligatoire' })
      return
    }
    saveProduct(product.id, draft)
    toast({ tone: 'success', title: 'Boisson enregistrée', message: draft.name })
    onClose()
  }

  /** Ajoute une option a un groupe de variantes. */
  const addOption = (groupId: string) => {
    setDraft(p => ({
      ...p,
      variantGroups: p.variantGroups.map(g => g.id !== groupId ? g : {
        ...g,
        options: [...g.options, {
          id: `opt_${Date.now()}`, label: 'Nouvelle option',
          priceDelta: 0, available: true,
        }],
      }),
    }))
  }

  const patchOption = (gid: string, oid: string, patch: Partial<VariantGroup['options'][0]>) => {
    setDraft(p => ({
      ...p,
      variantGroups: p.variantGroups.map(g => g.id !== gid ? g : {
        ...g,
        options: g.options.map(o => o.id === oid ? { ...o, ...patch } : o),
      }),
    }))
  }

  return (
    <Modal
      open onClose={onClose} wide
      title={product.name || 'Nouvelle boisson'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <div className="sk-stack">
        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Nom" required>
            <Input value={draft.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Slug" hint="Utilisé dans l’URL publique.">
            <Input value={draft.slug} onChange={e => set('slug', e.target.value)} />
          </Field>
        </div>

        <Field label="Description courte" hint="Affichée sur la carte produit.">
          <Input
            value={draft.shortDescription ?? ''}
            onChange={e => set('shortDescription', e.target.value)}
          />
        </Field>

        <Field label="Description détaillée">
          <Textarea
            value={draft.description ?? ''}
            onChange={e => set('description', e.target.value)}
          />
        </Field>

        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Prix (FCFA)" required>
            <Input
              type="number" value={draft.price}
              onChange={e => set('price', Number(e.target.value))}
            />
          </Field>
          <Field label="Ancien prix" hint="Laisser vide hors promotion.">
            <Input
              type="number" value={draft.compareAtPrice ?? ''}
              onChange={e => set('compareAtPrice', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <Field label="Catégorie">
            <Select
              value={draft.categoryId ?? ''}
              onChange={e => set('categoryId', e.target.value || undefined)}
            >
              <option value="">— Aucune —</option>
              {d.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Statut">
            <Select
              value={draft.status}
              onChange={e => set('status', e.target.value as Product['status'])}
            >
              <option value="active">En ligne</option>
              <option value="hidden">Masquée</option>
              <option value="archived">Archivée</option>
            </Select>
          </Field>
          <Field label="Stock" hint="Vide = disponibilité manuelle.">
            <Input
              type="number" value={draft.stock ?? ''}
              onChange={e => set('stock', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Temps de préparation">
            <Input
              value={draft.prepTime ?? ''} placeholder="3–4 min"
              onChange={e => set('prepTime', e.target.value)}
            />
          </Field>
        </div>

        <Card title="Mise en avant">
          <div className="sk-row sk-row-wrap" style={{ gap: 'var(--sk-space-6)' }}>
            <Switch checked={draft.available} onChange={v => set('available', v)} label="Disponible" />
            <Checkbox checked={draft.isNew} onChange={v => set('isNew', v)} label="Nouveauté" />
            <Checkbox checked={draft.isPopular} onChange={v => set('isPopular', v)} label="Populaire" />
            <Checkbox checked={draft.isFeatured} onChange={v => set('isFeatured', v)} label="En vedette" />
          </div>
        </Card>

        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Ingrédients" hint="Séparés par une virgule.">
            <Input
              value={draft.ingredients.join(', ')}
              onChange={e => set('ingredients', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </Field>
          <Field label="Allergènes" hint="Séparés par une virgule.">
            <Input
              value={draft.allergens.join(', ')}
              onChange={e => set('allergens', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </Field>
        </div>

        <div className="sk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Tags" hint="Séparés par une virgule.">
            <Input
              value={draft.tags.join(', ')}
              onChange={e => set('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </Field>
          <Field label="Calories (kcal)">
            <Input
              type="number" value={draft.nutrition?.kcal ?? ''}
              onChange={e => set('nutrition', {
                ...draft.nutrition,
                kcal: e.target.value ? Number(e.target.value) : undefined,
              })}
            />
          </Field>
        </div>

        {/* --- VARIANTES --- */}
        {draft.variantGroups.map(g => (
          <Card
            key={g.id}
            title={`${g.name} ${g.required ? '(obligatoire)' : '(facultatif)'}`}
            action={
              <Button variant="ghost" size="sm" onClick={() => addOption(g.id)}>
                ＋ Option
              </Button>
            }
          >
            <div className="sk-stack sk-stack-sm">
              {g.options.map(o => (
                <div key={o.id} className="sk-row" style={{ gap: 'var(--sk-space-3)' }}>
                  <Input
                    value={o.label} style={{ flex: 2 }}
                    onChange={e => patchOption(g.id, o.id, { label: e.target.value })}
                  />
                  <Input
                    type="number" value={o.priceDelta} style={{ flex: 1 }}
                    onChange={e => patchOption(g.id, o.id, { priceDelta: Number(e.target.value) })}
                  />
                  <span className="sk-text-xs sk-dim" style={{ width: 30 }}>F</span>
                  <Switch
                    checked={o.available}
                    onChange={v => patchOption(g.id, o.id, { available: v })}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Modal>
  )
}

export function ProductsPage() {
  const d = useData()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | Product['status']>('all')
  const [editing, setEditing] = useState<Product | null>(null)
  const [confirmDel, setConfirmDel] = useState<Product | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.products
      .filter(p => status === 'all' || p.status === status)
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => a.position - b.position)
  }, [d.products, query, status])

  const { sorted, sortKey, sortDir, toggleSort } = useSort(filtered, 'position')
  const pager = usePagination(sorted, 12)
  const { rowProps } = useDragOrder(filtered, reorderProducts)

  const counts = {
    all: d.products.length,
    active: d.products.filter(p => p.status === 'active').length,
    hidden: d.products.filter(p => p.status === 'hidden').length,
    archived: d.products.filter(p => p.status === 'archived').length,
  }

  const toggleSel = (id: string) => setSelected(s => {
    const next = new Set(s)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  /** Action groupee : change le statut de toutes les lignes cochees. */
  const bulkStatus = (st: Product['status']) => {
    for (const id of selected) saveProduct(id, { status: st })
    toast({ tone: 'success', title: `${selected.size} boisson(s) mise(s) à jour` })
    setSelected(new Set())
  }

  return (
    <>
      <PageHead
        title="Boissons"
        subtitle="Le catalogue réel du site public. Toute modification ici changera la page /bobas une fois la base connectée."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportCsv('boissons.csv',
              d.products.map(p => ({
                nom: p.name, slug: p.slug, prix: p.price,
                categorie: d.categories.find(c => c.id === p.categoryId)?.name ?? '',
                statut: STATUS_LABEL[p.status], disponible: p.available ? 'oui' : 'non',
                populaire: p.isPopular ? 'oui' : 'non', vedette: p.isFeatured ? 'oui' : 'non',
              })))}>
              Exporter CSV
            </Button>
            <Button onClick={() => setEditing(createProduct())}>＋ Nouvelle boisson</Button>
          </>
        }
      />

      <div className="sk-toolbar">
        <SearchInput value={query} onChange={v => { setQuery(v); pager.reset() }} placeholder="Rechercher une boisson…" />
        <Pill active={status === 'all'} count={counts.all} onClick={() => setStatus('all')}>Toutes</Pill>
        <Pill active={status === 'active'} count={counts.active} onClick={() => setStatus('active')}>En ligne</Pill>
        <Pill active={status === 'hidden'} count={counts.hidden} onClick={() => setStatus('hidden')}>Masquées</Pill>
        <Pill active={status === 'archived'} count={counts.archived} onClick={() => setStatus('archived')}>Archivées</Pill>
      </div>

      {selected.size > 0 && (
        <div className="sk-bulkbar">
          <strong>{selected.size} sélectionnée(s)</strong>
          <Button size="sm" variant="outline" onClick={() => bulkStatus('active')}>Mettre en ligne</Button>
          <Button size="sm" variant="outline" onClick={() => bulkStatus('hidden')}>Masquer</Button>
          <Button size="sm" variant="outline" onClick={() => bulkStatus('archived')}>Archiver</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Annuler</Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Icon name="products" />}
            title={query ? 'Aucun résultat' : 'Aucune boisson'}
            text={query ? 'Aucune boisson ne correspond à cette recherche.' : 'Ajoute ta première boisson au catalogue.'}
            action={!query && <Button size="sm" onClick={() => setEditing(createProduct())}>＋ Nouvelle boisson</Button>}
          />
        </Card>
      ) : (
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th style={{ width: 34 }} />
                <th style={{ width: 30 }} title="Glisser pour réordonner">⇅</th>
                <SortHeader label="Boisson" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Mise en avant</th>
                <SortHeader label="Prix" numeric active={sortKey === 'price'} dir={sortDir} onClick={() => toggleSort('price')} />
                <th className="sk-table-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map(p => (
                <tr key={p.id} {...rowProps(p.id)}>
                  <td>
                    <Checkbox checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} />
                  </td>
                  <td className="sk-drag-handle" title="Glisser pour réordonner">⋮⋮</td>
                  <td>
                    <button
                      onClick={() => setEditing(p)}
                      style={{
                        background: 'none', border: 0, padding: 0, cursor: 'pointer',
                        font: 'inherit', fontWeight: 600, textAlign: 'left',
                      }}
                    >{p.name}</button>
                    {p.shortDescription && (
                      <p className="sk-text-xs sk-dim" style={{ margin: '2px 0 0' }}>{p.shortDescription}</p>
                    )}
                  </td>
                  <td className="sk-muted sk-text-sm">
                    {d.categories.find(c => c.id === p.categoryId)?.name ?? '—'}
                  </td>
                  <td>
                    <StatusSelect
                      value={p.status}
                      options={STATUS_OPTIONS}
                      tones={STATUS_TONE}
                      onChange={st => {
                        // Archiver retire aussi de la vente : sinon une
                        // boisson archivee resterait commandable.
                        saveProduct(p.id, {
                          status: st,
                          ...(st === 'archived' ? { available: false } : {}),
                        })
                        toast({
                          tone: st === 'active' ? 'success' : 'info',
                          title: `« ${p.name} » — ${STATUS_LABEL[st]}`,
                        })
                      }}
                    />
                  </td>
                  <td>
                    <div className="sk-row" style={{ gap: 4 }}>
                      {p.isNew && <Tag>Nouveau</Tag>}
                      {p.isPopular && <Tag>Populaire</Tag>}
                      {p.isFeatured && <Tag>Vedette</Tag>}
                      {!p.isNew && !p.isPopular && !p.isFeatured && <span className="sk-dim">—</span>}
                    </div>
                  </td>
                  <td className="sk-table-numeric sk-numeric">
                    {formatAmount(p.price)}
                    {p.compareAtPrice && (
                      <div className="sk-text-2xs sk-dim" style={{ textDecoration: 'line-through' }}>
                        {formatAmount(p.compareAtPrice)}
                      </div>
                    )}
                  </td>
                  <td className="sk-table-actions">
                    <Dropdown trigger={<Button variant="ghost" size="sm" icon={<Icon name="more" />} aria-label="Actions" />}>
                      <DropdownItem onClick={() => setEditing(p)}>Modifier</DropdownItem>
                      <DropdownItem onClick={() => {
                        duplicateProduct(p.id)
                        toast({ tone: 'success', title: 'Boisson dupliquée' })
                      }}>Dupliquer</DropdownItem>
                      {p.status === 'active' ? (
                        <DropdownItem onClick={() => {
                          saveProduct(p.id, { status: 'hidden' })
                          toast({ tone: 'info', title: 'Boisson masquée' })
                        }}>Masquer</DropdownItem>
                      ) : (
                        <DropdownItem onClick={() => {
                          saveProduct(p.id, { status: 'active' })
                          toast({ tone: 'success', title: 'Boisson en ligne' })
                        }}>Mettre en ligne</DropdownItem>
                      )}
                      <div className="sk-dropdown-sep" />
                      <DropdownItem onClick={() => {
                        archiveProduct(p.id)
                        toast({ tone: 'info', title: 'Boisson archivée' })
                      }}>Archiver</DropdownItem>
                      <DropdownItem danger onClick={() => setConfirmDel(p)}>Supprimer</DropdownItem>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pager} onChange={pager.setPage} />
        </div>
      )}

      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) {
            deleteProduct(confirmDel.id)
            toast({ tone: 'danger', title: 'Boisson supprimée' })
          }
        }}
        title={`Supprimer « ${confirmDel?.name} » ?`}
        message="Cette action est irréversible. Si la boisson apparaît dans des commandes passées, préfère l’archivage pour préserver l’historique et les statistiques."
      />
    </>
  )
}

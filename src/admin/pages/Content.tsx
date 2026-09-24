import { Icon } from '../Icon'
// CMS : chaque section du site public devient administrable — textes,
// images, visibilite, ordre.
//
// Les sections marquees `locked` (Hero, Footer) ne peuvent etre ni masquees
// ni deplacees : ce sont des elements structurels dont la disparition
// casserait la page.

import { PageHead } from '../AdminApp'
import { reorderSections, saveSectionField, toggleSection, useData } from '../store'
import {
  Badge, Card, EmptyState, Field, Input, Notice, Switch, Textarea,
  useDragOrder, useToast,
} from '../ui'

const PAGE_LABEL = { home: 'Accueil', bobas: 'Nos bobas', global: 'Global' } as const

export function ContentPage() {
  const d = useData()
  const toast = useToast()
  const sorted = [...d.sections].sort((a, b) => a.position - b.position)
  const { rowProps } = useDragOrder(sorted, reorderSections)

  return (
    <>
      <PageHead
        title="Contenu du site"
        subtitle="Modifie les textes et images du site public, masque une section sans la supprimer, réorganise l’ordre par glisser-déposer."
      />

      <div style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Notice>
          Les modifications sont enregistrées et journalisées. Elles
          s’appliqueront au site public dès que la base de données sera
          connectée — le site lit aujourd’hui encore ses textes depuis le code.
        </Notice>
      </div>

      {sorted.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={<Icon name="content" />} title="Aucune section" />
        </Card>
      ) : (
        <div className="sk-stack">
          {sorted.map(s => (
            <div key={s.id} {...(s.locked ? {} : rowProps(s.id))}>
              <Card
                title={
                  <div className="sk-row">
                    {!s.locked && (
                      <span className="sk-drag-handle" title="Glisser pour réordonner">⋮⋮</span>
                    )}
                    <h3 className="sk-h6">{s.name}</h3>
                    <Badge tone="neutral">{PAGE_LABEL[s.page]}</Badge>
                    {s.locked && <Badge tone="info">Structurelle</Badge>}
                    {!s.visible && <Badge tone="warning">Masquée</Badge>}
                  </div>
                }
                action={
                  <Switch
                    checked={s.visible}
                    disabled={s.locked}
                    onChange={() => {
                      toggleSection(s.id)
                      toast({
                        tone: 'info',
                        title: s.visible ? 'Section masquée' : 'Section affichée',
                        message: s.name,
                      })
                    }}
                    label={<span className="sk-text-xs">{s.visible ? 'Visible' : 'Masquée'}</span>}
                  />
                }
              >
                {s.fields.length === 0 ? (
                  <p className="sk-text-sm sk-dim">
                    Cette section n’a pas de contenu éditable : elle est purement visuelle.
                  </p>
                ) : (
                  <div className="sk-stack">
                    {s.fields.map(f => (
                      <Field key={f.key} label={f.label} hint={f.kind === 'image' ? 'Nom du fichier dans la médiathèque.' : undefined}>
                        {f.kind === 'textarea' ? (
                          <Textarea
                            defaultValue={f.value}
                            onBlur={e => {
                              if (e.target.value !== f.value) {
                                saveSectionField(s.id, f.key, e.target.value)
                                toast({ tone: 'success', title: 'Contenu enregistré' })
                              }
                            }}
                          />
                        ) : (
                          <Input
                            type={f.kind === 'color' ? 'color' : 'text'}
                            defaultValue={f.value}
                            onBlur={e => {
                              if (e.target.value !== f.value) {
                                saveSectionField(s.id, f.key, e.target.value)
                                toast({ tone: 'success', title: 'Contenu enregistré' })
                              }
                            }}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

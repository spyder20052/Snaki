// ===========================================================================
// SNAKI — VITRINE DU DESIGN SYSTEM
// ===========================================================================
// Page de documentation vivante : chaque token et chaque composant y est
// affiche tel qu'il se rend reellement. Elle sert de reference partagee
// (« quel orange ? quel radius ? ») et de test visuel — si un composant
// casse, on le voit ici avant de le voir en production.

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, Dropdown, DropdownItem,
  EmptyState, Field, Input, Kpi, Modal, Notice, Pagination, Pill, Radio,
  SearchInput, Select, Skeleton, StatusSelect, Switch, Tag, Textarea,
  useAdminArea, useDragOrder, useToast,
} from '../admin/ui'

/** Bloc de documentation : un titre, une description, le rendu. */
function Section({ id, title, note, children }: {
  id: string
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section id={id} style={{ marginBottom: 'var(--sk-space-16)', scrollMarginTop: 80 }}>
      <h2 className="sk-h4" style={{ marginBottom: 'var(--sk-space-2)' }}>{title}</h2>
      {note && (
        <p className="sk-text-sm sk-muted" style={{ maxWidth: '68ch', marginBottom: 'var(--sk-space-5)' }}>
          {note}
        </p>
      )}
      <div className="sk-stack">{children}</div>
    </section>
  )
}

/** Pastille de couleur avec son nom de token et sa valeur resolue. */
function Swatch({ token, name }: { token: string; name: string }) {
  return (
    <div>
      <div style={{
        height: 62,
        background: `var(${token})`,
        borderRadius: 'var(--sk-radius-md)',
        border: 'var(--sk-border-subtle)',
      }} />
      <p className="sk-text-xs" style={{ marginTop: 6, fontWeight: 600 }}>{name}</p>
      <code className="sk-text-2xs sk-dim">{token}</code>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="sk-row sk-row-wrap">{children}</div>
}

type Status = 'active' | 'hidden' | 'archived'
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'active', label: 'En ligne' },
  { value: 'hidden', label: 'Masquée' },
  { value: 'archived', label: 'Archivée' },
]
const STATUS_TONES: Record<Status, string> = {
  active: 'success', hidden: 'warning', archived: 'neutral',
}

const NAV = [
  ['colors', 'Couleurs'], ['states', 'États'], ['type', 'Typographie'],
  ['buttons', 'Boutons'], ['forms', 'Formulaires'], ['badges', 'Badges & tags'],
  ['cards', 'Cartes & KPI'], ['tables', 'Tableaux'], ['overlays', 'Modales & menus'],
  ['feedback', 'Retours & états'], ['tokens', 'Espacements & ombres'],
  ['assets', 'Logo & photos'],
] as const

export function DesignShowcase() {
  // Meme raison que le dashboard : rendre le curseur natif visible.
  useAdminArea()
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [sw, setSw] = useState(true)
  const [cb, setCb] = useState(true)
  const [radio, setRadio] = useState('m')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(2)
  const [filter, setFilter] = useState('all')
  // Statut modifiable et lignes reordonnables : les deux mecanismes du
  // tableau des boissons, montres ici pour pouvoir les tester isolement.
  const [rows, setRows] = useState([
    { id: 'a', name: 'Classique Perles', cat: 'Bubble tea', price: 2500, status: 'active' as Status },
    { id: 'b', name: 'Fraise Givrée', cat: 'Thé fruité', price: 3000, status: 'hidden' as Status },
    { id: 'c', name: 'Matcha Nuage', cat: 'Specials', price: 3500, status: 'active' as Status },
    { id: 'd', name: 'Oreo Boba', cat: 'Milk tea', price: 3400, status: 'archived' as Status },
  ])
  const { rowProps } = useDragOrder(rows, ids =>
    setRows(rs => ids.map(id => rs.find(r => r.id === id)!)))

  return (
    <div className="sk-root" style={{ background: 'var(--sk-bg-page)', minHeight: '100vh' }}>
      {/* En-tete */}
      <header style={{
        padding: 'var(--sk-space-10) var(--sk-space-6) var(--sk-space-8)',
        background: 'var(--sk-ink-900)',
        color: 'var(--sk-text-inverse)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p className="sk-eyebrow" style={{ color: 'var(--sk-brand-300)' }}>Design System</p>
          <h1 className="sk-h2" style={{ margin: '8px 0' }}>SNAKI</h1>
          <p className="sk-text-sm" style={{ opacity: .72, maxWidth: '62ch' }}>
            Référence unique de l’identité visuelle. Le site public et le
            dashboard consomment les mêmes tokens : une couleur modifiée ici
            se propage partout.
          </p>
          <nav className="sk-row sk-row-wrap" style={{ marginTop: 'var(--sk-space-6)', gap: 8 }}>
            {NAV.map(([id, label]) => (
              <a
                key={id} href={`#${id}`}
                className="sk-text-xs"
                style={{
                  padding: '6px 12px',
                  color: 'var(--sk-white)',
                  background: 'rgba(255,255,255,.1)',
                  borderRadius: 'var(--sk-radius-pill)',
                  textDecoration: 'none',
                }}
              >{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: 'var(--sk-space-12) var(--sk-space-6)' }}>

        <Section
          id="colors" title="Couleurs de marque"
          note="Trois teintes fondent l’identité : l’orange Snaki (action et accent), le brun-noir des textes, le crème des fonds. Les paliers 100 à 700 en sont dérivés."
        >
          <div className="sk-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            <Swatch token="--sk-brand-100" name="Brand 100" />
            <Swatch token="--sk-brand-200" name="Brand 200" />
            <Swatch token="--sk-brand-300" name="Brand 300" />
            <Swatch token="--sk-brand-400" name="Brand 400" />
            <Swatch token="--sk-brand-500" name="Brand 500 ★" />
            <Swatch token="--sk-brand-600" name="Brand 600" />
            <Swatch token="--sk-brand-700" name="Brand 700" />
          </div>
          <div className="sk-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            <Swatch token="--sk-ink-900" name="Ink 900 ★" />
            <Swatch token="--sk-ink-700" name="Ink 700" />
            <Swatch token="--sk-ink-500" name="Ink 500" />
            <Swatch token="--sk-ink-300" name="Ink 300" />
            <Swatch token="--sk-ink-100" name="Ink 100" />
            <Swatch token="--sk-sand-300" name="Sand 300 ★" />
            <Swatch token="--sk-sand-100" name="Sand 100" />
          </div>
          <div className="sk-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            <Swatch token="--sk-cocoa-500" name="Cocoa" />
            <Swatch token="--sk-gold-500" name="Gold" />
            <Swatch token="--sk-lemon-500" name="Lemon" />
          </div>
        </Section>

        <Section
          id="states" title="Couleurs d’état"
          note="Chaque état porte trois rôles — texte, fond, bordure — pour rester lisible sans dépendre de la seule couleur (accessibilité daltonisme)."
        >
          <Row>
            <Badge tone="success" dot>Succès</Badge>
            <Badge tone="danger" dot>Erreur</Badge>
            <Badge tone="warning" dot>Avertissement</Badge>
            <Badge tone="info" dot>Information</Badge>
            <Badge tone="neutral" dot>Neutre</Badge>
            <Badge tone="brand" dot>Marque</Badge>
          </Row>
          <div className="sk-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            <Swatch token="--sk-success-fg" name="Succès" />
            <Swatch token="--sk-danger-fg" name="Erreur" />
            <Swatch token="--sk-warning-fg" name="Alerte" />
            <Swatch token="--sk-info-fg" name="Info" />
          </div>
        </Section>

        <Section
          id="type" title="Typographie"
          note="Trois familles à rôle strict : Mouse Memoirs pour les titres éditoriaux, Archivo Black pour les titres compacts et les chiffres, DM Sans pour le texte courant. Les tailles sont fluides (clamp) entre mobile et desktop."
        >
          <Card>
            <h1 className="sk-h1">Titre H1</h1>
            <h2 className="sk-h2">Titre H2</h2>
            <h3 className="sk-h3">Titre H3</h3>
            <h4 className="sk-h4">Titre H4</h4>
            <h5 className="sk-h5">Titre H5</h5>
            <h6 className="sk-h6">Titre H6</h6>
            <hr style={{ margin: 'var(--sk-space-5) 0', border: 0, borderTop: 'var(--sk-border-subtle)' }} />
            <p className="sk-eyebrow">Sur-titre en capitales</p>
            <p className="sk-text-lg">Paragraphe large — pour les chapôs et introductions.</p>
            <p className="sk-text">Paragraphe courant. C’est la taille de référence du corps de texte.</p>
            <p className="sk-text-sm sk-muted">Petit texte secondaire, pour les précisions.</p>
            <p className="sk-text-xs sk-dim">Très petit texte, pour les mentions.</p>
            <p className="sk-numeric sk-h4" style={{ marginTop: 12 }}>2 500 F · 12 480 F</p>
            <p className="sk-text-xs sk-dim">Chiffres tabulaires : les colonnes ne tremblent pas quand la valeur change.</p>
          </Card>
        </Section>

        <Section
          id="buttons" title="Boutons"
          note="Cinq variantes et trois tailles. La forme en pilule et le contour épais reprennent la signature du site public."
        >
          <Card>
            <div className="sk-stack">
              <Row>
                <Button variant="primary">Primaire</Button>
                <Button variant="secondary">Secondaire</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </Row>
              <Row>
                <Button size="sm">Petit</Button>
                <Button>Normal</Button>
                <Button size="lg">Grand</Button>
                <Button icon="＋" aria-label="Ajouter" />
              </Row>
              <Row>
                <Button disabled>Désactivé</Button>
                <Button variant="outline" disabled>Désactivé</Button>
              </Row>
            </div>
          </Card>
        </Section>

        <Section
          id="forms" title="Formulaires"
          note="Tous les contrôles partagent le même anneau de focus, indispensable à la navigation clavier. Les champs en erreur changent de bordure ET de fond."
        >
          <div className="sk-grid sk-grid-2">
            <Card title="Champs">
              <div className="sk-stack">
                <Field label="Nom de la boisson" required hint="Visible sur le site public.">
                  <Input placeholder="Classique Perles" defaultValue="Matcha Nuage" />
                </Field>
                <Field label="Prix" hint="En francs CFA, sans décimales.">
                  <Input type="number" defaultValue={3500} />
                </Field>
                <Field label="Champ en erreur" error="Ce champ est obligatoire.">
                  <Input invalid placeholder="Vide" />
                </Field>
                <Field label="Description">
                  <Textarea placeholder="Thé vert matcha, chantilly, perles de tapioca…" />
                </Field>
                <Field label="Catégorie">
                  <Select defaultValue="milk">
                    <option value="bubble">Bubble tea</option>
                    <option value="milk">Milk tea</option>
                    <option value="fruit">Thé fruité</option>
                  </Select>
                </Field>
                <Field label="Recherche">
                  <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une boisson…" />
                </Field>
                <Field label="Désactivé">
                  <Input disabled defaultValue="Non modifiable" />
                </Field>
              </div>
            </Card>
            <Card title="Sélecteurs">
              <div className="sk-stack">
                <Switch checked={sw} onChange={setSw} label="Accepter les commandes" />
                <Switch checked={!sw} onChange={v => setSw(!v)} label="Masquer la section" />
                <Switch checked={false} onChange={() => {}} label="Désactivé" disabled />
                <hr style={{ border: 0, borderTop: 'var(--sk-border-subtle)' }} />
                <Checkbox checked={cb} onChange={setCb} label="Mettre en vedette" />
                <Checkbox checked={false} onChange={() => {}} label="Nouveauté" />
                <hr style={{ border: 0, borderTop: 'var(--sk-border-subtle)' }} />
                <Radio name="size" checked={radio === 's'} onChange={() => setRadio('s')} label="Petit" />
                <Radio name="size" checked={radio === 'm'} onChange={() => setRadio('m')} label="Moyen" />
                <Radio name="size" checked={radio === 'l'} onChange={() => setRadio('l')} label="Grand" />
              </div>
            </Card>
          </div>
        </Section>

        <Section
          id="badges" title="Badges, tags et pills"
          note="Trois formes voisines, trois rôles distincts : le badge dit un état, le tag classe, la pill filtre ou compte."
        >
          <Card>
            <div className="sk-stack">
              <div>
                <p className="sk-eyebrow" style={{ marginBottom: 8 }}>Badges — statuts de commande</p>
                <Row>
                  <Badge tone="brand">Nouvelle</Badge>
                  <Badge tone="warning">En attente</Badge>
                  <Badge tone="info">En préparation</Badge>
                  <Badge tone="success">Terminée</Badge>
                  <Badge tone="danger">Annulée</Badge>
                  <Badge tone="neutral">Remboursée</Badge>
                </Row>
              </div>
              <div>
                <p className="sk-eyebrow" style={{ marginBottom: 8 }}>Tags — classification</p>
                <Row>
                  <Tag onRemove={() => {}}>Doux</Tag>
                  <Tag onRemove={() => {}}>Sans lactose</Tag>
                  <Tag>Populaire</Tag>
                </Row>
              </div>
              <div>
                <p className="sk-eyebrow" style={{ marginBottom: 8 }}>Pills — filtres</p>
                <Row>
                  <Pill active={filter === 'all'} count={6} onClick={() => setFilter('all')}>Toutes</Pill>
                  <Pill active={filter === 'on'} count={6} onClick={() => setFilter('on')}>En ligne</Pill>
                  <Pill active={filter === 'off'} count={0} onClick={() => setFilter('off')}>Masquées</Pill>
                </Row>
              </div>
            </div>
          </Card>
        </Section>

        <Section
          id="cards" title="Cartes et KPI"
          note="La carte KPI affiche un libellé, une valeur en chiffres tabulaires et une variation. Sans période de référence, aucune variation n’est affichée — plutôt que d’inventer un pourcentage."
        >
          <div className="sk-grid sk-grid-kpi">
            <Kpi label="Chiffre d’affaires du jour" value="—" hint="Aucune commande enregistrée" />
            <Kpi label="Commandes" value="0" hint="En attente de données réelles" />
            <Kpi label="Panier moyen" value="—" />
            <Kpi label="Taux de conversion" value="—" />
          </div>
          <div className="sk-grid sk-grid-2">
            <Card title="Carte avec en-tête" action={<Button variant="ghost" size="sm">Action</Button>}>
              <p className="sk-text-sm sk-muted">
                Contenu de la carte. L’en-tête accueille un titre et une action.
              </p>
            </Card>
            <Card title="Carte simple">
              <p className="sk-text-sm sk-muted">Une surface blanche, une bordure discrète, un rayon large.</p>
            </Card>
          </div>
        </Section>

        <Section
          id="tables" title="Tableaux et pagination"
          note="Statut modifiable en un clic, lignes réordonnables au glisser-déposer (la ligne saisie s’estompe, un trait orange marque le point d’insertion), en-têtes triables, défilement horizontal contenu dans la boîte."
        >
          <div className="sk-table-wrap">
            <table className="sk-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }} title="Glisser pour réordonner">⇅</th>
                  <th data-sortable="">Boisson ↓</th>
                  <th>Catégorie</th>
                  <th>Statut</th>
                  <th className="sk-table-numeric">Prix</th>
                  <th className="sk-table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} {...rowProps(r.id)}>
                    <td className="sk-drag-handle" title="Glisser pour réordonner">⋮⋮</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="sk-muted">{r.cat}</td>
                    <td>
                      <StatusSelect
                        value={r.status}
                        options={STATUS_OPTIONS}
                        tones={STATUS_TONES}
                        onChange={st => {
                          setRows(rs => rs.map(x => x.id === r.id ? { ...x, status: st } : x))
                          toast({ tone: 'success', title: `${r.name} — ${st}` })
                        }}
                      />
                    </td>
                    <td className="sk-table-numeric sk-numeric">
                      {new Intl.NumberFormat('fr-FR').format(r.price)} F
                    </td>
                    <td className="sk-table-actions">
                      <Dropdown trigger={<Button variant="ghost" size="sm" icon="⋯" aria-label="Actions" />}>
                        <DropdownItem>Modifier</DropdownItem>
                        <DropdownItem>Dupliquer</DropdownItem>
                        <div className="sk-dropdown-sep" />
                        <DropdownItem danger>Archiver</DropdownItem>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageCount={5} from={13} to={24} total={58} onChange={setPage} />
          </div>
        </Section>

        <Section
          id="overlays" title="Modales, menus et infobulles"
          note="La modale se ferme au clavier (Échap) et au clic sur le voile, et bloque le défilement de la page derrière elle. Toute action destructrice passe par une confirmation."
        >
          <Card>
            <Row>
              <Button onClick={() => setModal(true)}>Ouvrir une modale</Button>
              <Button variant="destructive" onClick={() => setConfirm(true)}>Supprimer (confirmation)</Button>
              <Dropdown trigger={<Button variant="outline">Menu déroulant ▾</Button>}>
                <DropdownItem>Modifier</DropdownItem>
                <DropdownItem>Dupliquer</DropdownItem>
                <div className="sk-dropdown-sep" />
                <DropdownItem danger>Supprimer</DropdownItem>
              </Dropdown>
              <span className="sk-tooltip" data-tip="Infobulle au survol" tabIndex={0}>
                <Button variant="ghost">Survole-moi</Button>
              </span>
            </Row>
          </Card>
          <Card title="Notifications (toasts)">
            <Row>
              <Button variant="outline" size="sm" onClick={() => toast({ tone: 'success', title: 'Enregistré', message: 'La boisson a été mise à jour.' })}>Succès</Button>
              <Button variant="outline" size="sm" onClick={() => toast({ tone: 'danger', title: 'Échec', message: 'Le paiement a été refusé.' })}>Erreur</Button>
              <Button variant="outline" size="sm" onClick={() => toast({ tone: 'warning', title: 'Attention', message: 'Stock bientôt épuisé.' })}>Alerte</Button>
              <Button variant="outline" size="sm" onClick={() => toast({ tone: 'info', title: 'Information', message: 'Section masquée sur le site.' })}>Info</Button>
            </Row>
          </Card>
        </Section>

        <Section
          id="feedback" title="États : vide, erreur, chargement"
          note="Un écran sans donnée ne doit jamais ressembler à une page cassée : l’état vide explique et propose une action, le squelette signale que la donnée arrive."
        >
          <div className="sk-grid sk-grid-2">
            <Card title="État vide" padded={false}>
              <EmptyState
                icon="🧋"
                title="Aucune commande"
                text="Les commandes apparaîtront ici dès que le site en enregistrera."
                action={<Button size="sm">Ajouter une boisson</Button>}
              />
            </Card>
            <Card title="Chargement">
              <Skeleton lines={4} />
            </Card>
          </div>
          <Notice>
            Encart d’information : sert à expliquer un prérequis ou une limite.
          </Notice>
          <Notice tone="warning">
            Encart d’avertissement : signale une configuration manquante.
          </Notice>
          <div className="sk-error-box">
            <span aria-hidden="true">⛔</span>
            <div>Impossible de charger les données. Vérifie la connexion puis réessaie.</div>
          </div>
        </Section>

        <Section
          id="tokens" title="Espacements, rayons et ombres"
          note="L’échelle d’espacement avance par pas de 4 px. N’utiliser que ces valeurs : c’est ce qui donne le rythme visuel."
        >
          <Card title="Espacements">
            <div className="sk-stack sk-stack-sm">
              {[['1', 4], ['2', 8], ['3', 12], ['4', 16], ['6', 24], ['8', 32], ['12', 48], ['16', 64]].map(([n, px]) => (
                <div key={n as string} className="sk-row">
                  <code className="sk-text-2xs sk-dim" style={{ width: 110 }}>--sk-space-{n}</code>
                  <div style={{ width: px as number, height: 14, background: 'var(--sk-brand-500)', borderRadius: 3 }} />
                  <span className="sk-text-xs sk-dim">{px}px</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Rayons">
            <Row>
              {[['sm', '6px'], ['md', '10px'], ['lg', '16px'], ['xl', '24px'], ['pill', '999px']].map(([n, v]) => (
                <div key={n as string} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 78, height: 56,
                    background: 'var(--sk-brand-100)',
                    border: '2px solid var(--sk-brand-300)',
                    borderRadius: `var(--sk-radius-${n})`,
                  }} />
                  <code className="sk-text-2xs sk-dim">{n} · {v}</code>
                </div>
              ))}
            </Row>
          </Card>
          <Card title="Ombres">
            <Row>
              {['xs', 'sm', 'md', 'lg', 'xl', 'hard'].map(n => (
                <div key={n} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 88, height: 60,
                    background: 'var(--sk-white)',
                    borderRadius: 'var(--sk-radius-md)',
                    boxShadow: `var(--sk-shadow-${n})`,
                  }} />
                  <code className="sk-text-2xs sk-dim" style={{ display: 'block', marginTop: 10 }}>{n}</code>
                </div>
              ))}
            </Row>
          </Card>
        </Section>

        <Section
          id="assets" title="Logo et photos de boissons"
          note="Règles d’usage, pour que la marque reste reconnaissable partout."
        >
          <div className="sk-grid sk-grid-2">
            <Card title="Logo Snaki">
              <ul className="sk-text-sm sk-stack sk-stack-sm" style={{ paddingLeft: '1.1rem', margin: 0 }}>
                <li>Zone de respect minimale : la hauteur du « S » sur les quatre côtés.</li>
                <li>Sur fond crème ou blanc : version encre. Sur fond orange ou photo : version crème.</li>
                <li>Taille minimale 24 px de haut — en dessous, le point du « i » se perd.</li>
                <li>Ne jamais déformer, faire pivoter, ni recolorer hors palette.</li>
                <li>Toujours le fichier transparent, jamais une capture détourée.</li>
              </ul>
            </Card>
            <Card title="Photos de boissons">
              <ul className="sk-text-sm sk-stack sk-stack-sm" style={{ paddingLeft: '1.1rem', margin: 0 }}>
                <li>Gobelet détouré sur fond transparent, jamais de fond blanc résiduel.</li>
                <li>Cadrage vertical, gobelet entier avec la paille, légère marge en haut.</li>
                <li>Un visuel large (16:9) et un visuel vertical pour les photos d’ambiance.</li>
                <li>Format WebP ou AVIF de préférence ; viser moins de 300 Ko par image.</li>
                <li>Texte alternatif obligatoire, décrivant la boisson et non « image ».</li>
              </ul>
            </Card>
          </div>
          <Notice tone="warning">
            Les photos actuelles pèsent entre 1 et 3,6 Mo. Une conversion en
            WebP les réduirait d’un facteur 5 à 10 sans perte visible.
          </Notice>
        </Section>

        <Section
          id="grid" title="Grille et points de rupture"
          note="Grille de 12 colonnes, gouttière de 24 px. Les grilles de cartes s’auto-ajustent sans media query grâce à minmax()."
        >
          <Card>
            <table className="sk-table">
              <thead>
                <tr><th>Palier</th><th>Media query</th><th>Usage</th></tr>
              </thead>
              <tbody>
                <tr><td>Mobile</td><td><code className="sk-text-xs">base</code></td><td>Jusqu’à 639 px — une colonne</td></tr>
                <tr><td>Tablette</td><td><code className="sk-text-xs">min-width: 640px</code></td><td>Deux colonnes</td></tr>
                <tr><td>Tablette large</td><td><code className="sk-text-xs">min-width: 768px</code></td><td>Sidebar en tiroir</td></tr>
                <tr><td>Desktop</td><td><code className="sk-text-xs">min-width: 1024px</code></td><td>Sidebar fixe</td></tr>
                <tr><td>Desktop large</td><td><code className="sk-text-xs">min-width: 1280px</code></td><td>Conteneur maximal</td></tr>
              </tbody>
            </table>
          </Card>
        </Section>
      </main>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Exemple de modale"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button onClick={() => { setModal(false); toast({ tone: 'success', title: 'Enregistré' }) }}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="sk-stack">
          <Field label="Nom" required>
            <Input defaultValue="Matcha Nuage" />
          </Field>
          <Field label="Prix" hint="En francs CFA.">
            <Input type="number" defaultValue={3500} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => toast({ tone: 'danger', title: 'Supprimé', message: 'L’élément a été retiré.' })}
        title="Supprimer cette boisson ?"
        message="Cette action est irréversible. Préfère l’archivage si la boisson apparaît dans des commandes passées."
      />
    </div>
  )
}

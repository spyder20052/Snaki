import { Icon } from './Icon'
import { connectionState } from './store'
// ===========================================================================
// SNAKI — COMPOSANTS D'INTERFACE REUTILISABLES
// ===========================================================================
// Primitives React posees sur les classes du Design System. Le dashboard ET
// le site public peuvent les consommer : elles ne dependent que des tokens.
//
// Chaque composant reste volontairement mince — il applique les bonnes
// classes et gere l'accessibilite, rien de plus. La mise en forme vit dans
// components.css, pas ici.

import {
  cloneElement, isValidElement, createContext, useCallback, useContext, useEffect, useId, useMemo,
  useRef, useState,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// --- ZONE D'ADMINISTRATION -------------------------------------------------

/** Marque `<body>` pendant que la zone d'administration est affichee.
 *
 *  Le site public masque le curseur natif (`cursor:none`) pour afficher son
 *  curseur bulle. Cette regle s'appliquait a tout le document, y compris au
 *  dashboard qui ne rend pas ce curseur : on se retrouvait donc sans aucun
 *  pointeur visible. Le marqueur desactive la regle (voir
 *  `body:not([data-area])` dans App.css). */
export function useAdminArea() {
  useEffect(() => {
    document.body.dataset.area = 'admin'
    return () => { delete document.body.dataset.area }
  }, [])
}

// --- BOUTON ----------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'

export function Button({
  variant = 'primary', size, icon, children, className = '', ...rest
}: {
  variant?: ButtonVariant
  size?: 'sm' | 'lg'
  icon?: ReactNode
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    'sk-btn', `sk-btn-${variant}`,
    size ? `sk-btn-${size}` : '',
    // Sans libelle, le bouton devient carre (icone seule).
    !children && icon ? 'sk-btn-icon' : '',
    className,
  ].filter(Boolean).join(' ')
  return <button className={cls} {...rest}>{icon}{children}</button>
}

// --- BADGE, TAG, PILL ------------------------------------------------------

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand'

export function Badge({ tone = 'neutral', dot, children }: {
  tone?: Tone | string
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`sk-badge sk-badge-${tone}`}>
      {dot && <i className="sk-dot" />}
      {children}
    </span>
  )
}

export function Tag({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="sk-tag">
      {children}
      {onRemove && (
        <button className="sk-tag-remove" onClick={onRemove} aria-label="Retirer"><Icon name="close" size={12} /></button>
      )}
    </span>
  )
}

export function Pill({ active, count, children, ...rest }: {
  active?: boolean
  count?: number
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="sk-pill" aria-pressed={!!active} {...rest}>
      {children}
      {count !== undefined && <span className="sk-pill-count">{count}</span>}
    </button>
  )
}

// --- CARTE -----------------------------------------------------------------

export function Card({ title, action, children, padded = true, className = '' }: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  padded?: boolean
  className?: string
}) {
  return (
    <section className={`sk-card ${className}`}>
      {(title || action) && (
        <header className="sk-card-head">
          {typeof title === 'string' ? <h3 className="sk-h6">{title}</h3> : title}
          {action}
        </header>
      )}
      {padded ? <div className="sk-card-body">{children}</div> : children}
    </section>
  )
}

export function Kpi({ label, value, delta, hint }: {
  label: string
  value: ReactNode
  /** Variation en %, `undefined` quand il n'y a pas de periode de reference. */
  delta?: number
  hint?: string
}) {
  const tone = delta === undefined ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  return (
    <div className="sk-card sk-kpi">
      <p className="sk-kpi-label">{label}</p>
      <p className="sk-kpi-value">{value}</p>
      {delta !== undefined && (
        <span className={`sk-kpi-delta sk-kpi-delta-${tone}`}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}
          {' '}{Math.abs(delta).toFixed(1)} %
        </span>
      )}
      {hint && <p className="sk-text-xs sk-dim" style={{ marginTop: 6 }}>{hint}</p>}
    </div>
  )
}

// --- CHAMPS ----------------------------------------------------------------

export function Field({ label, hint, error, required, children }: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  const generatedId = useId()
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)
    && (children.type === Input || children.type === Textarea || children.type === Select)
    ? children : null
  const controlId = control?.props.id || generatedId
  const descriptionId = generatedId + '-description'
  return (
    <div className="sk-field">
      {label && (
        <label className="sk-label" htmlFor={control ? controlId : undefined} {...(required ? { 'data-required': '' } : {})}>
          {label}
        </label>
      )}
      {control ? cloneElement(control, {id:controlId,'aria-describedby':error || hint ? descriptionId : control.props['aria-describedby']}) : children}
      {error ? <span id={descriptionId} className="sk-error-text">{error}</span>
        : hint ? <span id={descriptionId} className="sk-hint">{hint}</span> : null}
    </div>
  )
}

export function Input({ invalid, ...rest }: {
  invalid?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="sk-input" {...(invalid ? { 'data-invalid': '' } : {})} {...rest} />
}

export function Textarea({ invalid, ...rest }: {
  invalid?: boolean
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="sk-textarea" {...(invalid ? { 'data-invalid': '' } : {})} {...rest} />
}

export function Select({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="sk-select" {...rest}>{children}</select>
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="sk-input-group">
      <span className="sk-input-group-icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        className="sk-input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className="sk-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="sk-switch-track" />
      {label}
    </label>
  )
}

export function Checkbox({ checked, onChange, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
}) {
  return (
    <label className="sk-check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Radio({ checked, onChange, name, label }: {
  checked: boolean
  onChange: () => void
  name: string
  label?: ReactNode
}) {
  return (
    <label className="sk-radio-item">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}

// --- MODALE ----------------------------------------------------------------

export function Modal({ open, onClose, title, footer, wide, children }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  footer?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Fermeture au clavier : `Escape` doit toujours fonctionner sur une modale.
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0)
    const timer = requestAnimationFrame(() => (focusable()[0] || dialogRef.current)?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current() }
      if (e.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements.at(-1)
        if (!first) { e.preventDefault(); dialogRef.current?.focus() }
        else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    // Bloque le defilement de la page derriere la modale.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      cancelAnimationFrame(timer)
      previousFocus?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div
      className="sk-overlay"
      // Clic sur le voile (et non sur la modale) = fermeture.
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`sk-modal ${wide ? 'sk-modal-lg' : ''}`}
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="sk-modal-head">
          <h2 className="sk-h5" id={titleId}>{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer" icon={<Icon name="close" />} />
        </header>
        <div className="sk-modal-body">{children}</div>
        {footer && <footer className="sk-modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

/** Confirmation avant une action destructrice. Le libelle du bouton est
 *  explicite (« Supprimer » et non « OK ») pour eviter les erreurs. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer' }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(); onClose() }}
          >{confirmLabel}</Button>
        </>
      }
    >
      <p className="sk-text-sm">{message}</p>
    </Modal>
  )
}

// --- MENU DEROULANT --------------------------------------------------------

export function Dropdown({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fermeture au clic extérieur : sans cela le menu resterait ouvert en
  // permanence dès qu'on clique ailleurs dans la page.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="sk-dropdown" ref={ref}>
      <span onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open && (
        <div className="sk-dropdown-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ danger, children, ...rest }: {
  danger?: boolean
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`sk-dropdown-item ${danger ? 'sk-dropdown-item-danger' : ''}`}
      {...rest}
    >{children}</button>
  )
}

// --- NOTIFICATIONS (TOASTS) ------------------------------------------------

interface Toast { id: number; tone: Tone; title: string; message?: string }

const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    if (connectionState.saving) return
    const id = Date.now() + Math.random()
    setItems(list => [...list, { ...t, id }])
    // Disparition automatique : un toast n'est pas une alerte bloquante.
    setTimeout(() => setItems(list => list.filter(x => x.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="sk-toasts" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`sk-toast sk-toast-${t.tone}`}>
            <div>
              <p className="sk-toast-title">{t.title}</p>
              {t.message && <p className="sk-toast-msg">{t.message}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// --- ETATS : VIDE, ERREUR, CHARGEMENT --------------------------------------

export function EmptyState({ icon = <Icon name="orders" />, title, text, action }: {
  icon?: ReactNode
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="sk-empty">
      <span className="sk-empty-icon" aria-hidden="true">{icon}</span>
      <p className="sk-empty-title">{title}</p>
      {text && <p className="sk-empty-text">{text}</p>}
      {action}
    </div>
  )
}

export function Notice({ tone = 'info', children }: {
  tone?: 'info' | 'warning'
  children: ReactNode
}) {
  return (
    <div className={`sk-notice ${tone === 'warning' ? 'sk-notice-warning' : ''}`}>
      <span aria-hidden="true"><Icon name="info" /></span>
      <div>{children}</div>
    </div>
  )
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      <div className="sk-skeleton sk-skeleton-title" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="sk-skeleton sk-skeleton-text" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="sk-table-wrap" aria-hidden="true">
      <table className="sk-table">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><div className="sk-skeleton sk-skeleton-text" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- PAGINATION ------------------------------------------------------------

/** Decoupe une liste en pages. Retourne aussi `reset`, a appeler quand un
 *  filtre change — sinon on reste sur une page 7 qui n'existe plus. */
export function usePagination<T>(items: T[], perPage = 12) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / perPage))
  // Si la liste rétrecit sous la page courante, on revient dans les bornes.
  const safePage = Math.min(page, pageCount)
  const slice = useMemo(
    () => items.slice((safePage - 1) * perPage, safePage * perPage),
    [items, safePage, perPage],
  )
  return {
    page: safePage, pageCount, slice, setPage,
    reset: () => setPage(1),
    total: items.length,
    from: items.length === 0 ? 0 : (safePage - 1) * perPage + 1,
    to: Math.min(safePage * perPage, items.length),
  }
}

export function Pagination({ page, pageCount, from, to, total, onChange }: {
  page: number
  pageCount: number
  from: number
  to: number
  total: number
  onChange: (p: number) => void
}) {
  if (total === 0) return null
  // Fenetre de 5 numeros autour de la page courante : au-dela, la barre
  // deviendrait plus large que le tableau.
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const nums = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i)
  return (
    <nav className="sk-pagination" aria-label="Pagination">
      <span className="sk-pagination-info">
        {from}–{to} sur {total}
      </span>
      <div className="sk-pagination-controls">
        <button
          className="sk-page-btn" onClick={() => onChange(page - 1)}
          disabled={page <= 1} aria-label="Page précédente"
        >‹</button>
        {nums.map(n => (
          <button
            key={n} className="sk-page-btn"
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >{n}</button>
        ))}
        <button
          className="sk-page-btn" onClick={() => onChange(page + 1)}
          disabled={page >= pageCount} aria-label="Page suivante"
        >›</button>
      </div>
    </nav>
  )
}

// --- TABLEAU TRIABLE -------------------------------------------------------

/** Tri d'une liste sur une cle. Le clic sur une meme colonne inverse le
 *  sens ; les valeurs `undefined` sont toujours renvoyees en fin de liste. */
export function useSort<T>(items: T[], initial?: keyof T) {
  const [key, setKey] = useState<keyof T | undefined>(initial)
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    if (!key) return items
    return [...items].sort((a, b) => {
      const x = a[key], y = b[key]
      if (x === y) return 0
      if (x === undefined || x === null) return 1
      if (y === undefined || y === null) return -1
      const cmp = typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'fr')
      return dir === 'asc' ? cmp : -cmp
    })
  }, [items, key, dir])

  const toggle = (k: keyof T) => {
    if (k === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setKey(k); setDir('desc') }
  }
  return { sorted, sortKey: key, sortDir: dir, toggleSort: toggle }
}

export function SortHeader({ label, active, dir, onClick, numeric }: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  numeric?: boolean
}) {
  return (
    <th
      data-sortable=""
      onClick={onClick}
      className={numeric ? 'sk-table-numeric' : ''}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

// --- GLISSER-DEPOSER -------------------------------------------------------

/** Reordonnancement par glisser-deposer natif HTML5. Retourne les props a
 *  epandre sur chaque ligne. Pas de dependance externe : l'API `dragstart`
 *  / `dragover` / `drop` suffit pour une liste verticale. */
export function useDragOrder<T extends { id: string }>(
  items: T[],
  onReorder: (ids: string[]) => void,
) {
  // `dragging` : la ligne saisie, `over` : la ligne survolee, `above` : le
  // cote du survol. Ces trois etats vivent dans le state (et non dans une
  // ref) parce qu'ils PILOTENT le rendu : sans cela le deplacement se
  // faisait a l'aveugle, on ne voyait rien bouger.
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [above, setAbove] = useState(false)

  const reset = () => { setDragging(null); setOver(null) }

  const rowProps = (id: string) => ({
    draggable: true,

    onDragStart: (e: React.DragEvent) => {
      setDragging(id)
      // `move` affiche le bon curseur systeme. Un `setData` est obligatoire
      // sous Firefox, sinon le glisser ne demarre pas du tout.
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    },

    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (id === dragging) return
      // On insere AVANT ou APRES selon la moitie survolee : c'est ce qui
      // rend le deplacement previsible plutot qu'aleatoire.
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setAbove(e.clientY < box.top + box.height / 2)
      setOver(id)
    },

    onDragLeave: (e: React.DragEvent) => {
      // Ne retire le reperage que si l'on quitte vraiment la ligne : sans
      // ce test, passer sur une cellule enfant fait clignoter l'indicateur.
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
      if (e.clientY < box.top || e.clientY > box.bottom) {
        setOver(o => (o === id ? null : o))
      }
    },

    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      const from = dragging
      reset()
      if (!from || from === id) return
      const ids = items.map(i => i.id)
      const fromIdx = ids.indexOf(from)
      if (fromIdx < 0) return
      ids.splice(fromIdx, 1)
      // L'index cible est recalcule APRES retrait de l'element deplace,
      // sinon un deplacement vers le bas atterrit une position trop haut.
      const target = ids.indexOf(id)
      if (target < 0) return
      ids.splice(above ? target : target + 1, 0, from)
      onReorder(ids)
    },

    // Le navigateur emet `dragend` meme si le depot echoue (touche Echap,
    // depot hors zone) : c'est le seul endroit sur pour nettoyer.
    onDragEnd: reset,

    className: [
      'sk-draggable',
      dragging === id ? 'sk-is-dragging' : '',
      over === id ? (above ? 'sk-drop-above' : 'sk-drop-below') : '',
    ].filter(Boolean).join(' '),
  })

  return { rowProps, dragging }
}

// --- SELECTEUR DE STATUT ---------------------------------------------------

/** Statut modifiable en un clic, directement dans la ligne du tableau.
 *
 *  Un `<select>` habille en badge : il garde tout le comportement natif
 *  (clavier, lecteurs d'ecran, listes longues sur mobile) tout en affichant
 *  la couleur de l'etat courant. Precedemment le statut n'etait accessible
 *  qu'a travers un menu deroulant, soit trois clics pour un changement qui
 *  est l'operation la plus courante du catalogue. */
export function StatusSelect<T extends string>({
  value, options, onChange, tones,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  /** Couleur de badge par valeur, pour rester coherent avec les tableaux. */
  tones: Record<T, string>
}) {
  return (
    <span className={`sk-status-select sk-badge sk-badge-${tones[value]}`}>
      <i className="sk-dot" />
      {options.find(o => o.value === value)?.label ?? value}
      <svg width="9" height="6" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        aria-label="Changer le statut"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  )
}

// --- EXPORT CSV ------------------------------------------------------------

/** Telecharge une liste au format CSV. Les valeurs sont echappees (guillemets
 *  doubles) pour que virgules et retours a la ligne ne cassent pas le
 *  fichier, et un BOM UTF-8 est ajoute pour qu'Excel lise les accents. */
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

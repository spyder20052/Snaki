// Parametres generaux : identite, contacts, livraison, horaires, SEO, et
// l'interrupteur global de prise de commandes.

import { useState } from 'react'
import { PageHead } from '../AdminApp'
import { addClosure, removeClosure, resetAll, saveSettings, useData } from '../store'
import {
  Button, Card, ConfirmDialog, Field, Input, Notice, Switch, Textarea, useToast,
} from '../ui'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export function SettingsPage() {
  const d = useData()
  const toast = useToast()
  const s = d.settings
  const [confirmReset, setConfirmReset] = useState(false)
  const [closure, setClosure] = useState({ from: '', to: '', reason: '' })

  /** Enregistre au `blur` : evite d'ecrire a chaque frappe tout en gardant
   *  un formulaire sans bouton « Enregistrer » a chercher. */
  const field = (key: keyof typeof s, label: string, opts: {
    type?: string; hint?: string; area?: boolean
  } = {}) => (
    <Field label={label} hint={opts.hint}>
      {opts.area ? (
        <Textarea
          defaultValue={String(s[key] ?? '')}
          onBlur={e => {
            if (e.target.value !== s[key]) {
              saveSettings({ [key]: e.target.value })
              toast({ tone: 'success', title: 'Enregistré' })
            }
          }}
        />
      ) : (
        <Input
          type={opts.type ?? 'text'}
          defaultValue={String(s[key] ?? '')}
          onBlur={e => {
            const v = opts.type === 'number' ? Number(e.target.value) : e.target.value
            if (v !== s[key]) {
              saveSettings({ [key]: v })
              toast({ tone: 'success', title: 'Enregistré' })
            }
          }}
        />
      )}
    </Field>
  )

  return (
    <>
      <PageHead
        title="Paramètres"
        subtitle="Identité de la marque, contacts, livraison, horaires et SEO."
      />

      {/* L'interrupteur le plus important du dashboard : il coupe la prise
          de commandes sur tout le site. */}
      <Card title="Prise de commandes">
        <div className="sk-stack">
          <Switch
            checked={s.acceptingOrders}
            onChange={v => {
              saveSettings({ acceptingOrders: v })
              toast({
                tone: v ? 'success' : 'warning',
                title: v ? 'Commandes ouvertes' : 'Commandes suspendues',
                message: v ? 'Le site accepte les commandes.' : 'Le message de fermeture s’affiche sur le site.',
              })
            }}
            label={<strong>{s.acceptingOrders ? 'Le site accepte les commandes' : 'Commandes suspendues'}</strong>}
          />
          {field('ordersClosedMessage', 'Message affiché quand les commandes sont fermées', { area: true })}
        </div>
      </Card>

      <div className="sk-grid sk-grid-2" style={{ marginTop: 'var(--sk-space-6)' }}>
        <Card title="Marque">
          <div className="sk-stack">
            {field('brandName', 'Nom de la marque')}
            {field('logo', 'Logo', { hint: 'Nom du fichier dans la médiathèque.' })}
            {field('favicon', 'Favicon')}
            {field('address', 'Adresse')}
          </div>
        </Card>

        <Card title="Contacts">
          <div className="sk-stack">
            {field('phone', 'Téléphone')}
            {field('whatsapp', 'WhatsApp', { hint: 'Format international, ex. +229…' })}
            {field('email', 'E-mail', { type: 'email' })}
            {field('instagram', 'Instagram')}
            {field('tiktok', 'TikTok')}
          </div>
        </Card>

        <Card title="Commandes & livraison">
          <div className="sk-stack">
            {field('currency', 'Devise')}
            {field('defaultDeliveryFee', 'Frais de livraison par défaut (FCFA)', { type: 'number' })}
            {field('minOrder', 'Montant minimum de commande (FCFA)', { type: 'number' })}
          </div>
        </Card>

        <Card title="SEO global">
          <div className="sk-stack">
            <Field label="Meta title">
              <Input defaultValue={s.seo.title}
                onBlur={e => saveSettings({ seo: { ...s.seo, title: e.target.value } })} />
            </Field>
            <Field label="Meta description" hint="Environ 155 caractères.">
              <Textarea defaultValue={s.seo.description}
                onBlur={e => saveSettings({ seo: { ...s.seo, description: e.target.value } })} />
            </Field>
            <Field label="Image OpenGraph">
              <Input defaultValue={s.seo.ogImage ?? ''}
                onBlur={e => saveSettings({ seo: { ...s.seo, ogImage: e.target.value } })} />
            </Field>
            <Switch checked={s.seo.noindex}
              onChange={v => saveSettings({ seo: { ...s.seo, noindex: v } })}
              label="Interdire l’indexation (noindex)" />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 'var(--sk-space-6)' }}>
        <Card title="Horaires d’ouverture" padded={false}>
          <table className="sk-table">
            <thead>
              <tr><th>Jour</th><th>Ouverture</th><th>Fermeture</th><th>Fermé</th></tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const h = s.openingHours.find(x => x.day === day)
                if (!h) return null
                const patch = (p: Partial<typeof h>) => saveSettings({
                  openingHours: s.openingHours.map(x => x.day === day ? { ...x, ...p } : x),
                })
                return (
                  <tr key={day}>
                    <td><strong>{DAYS[day]}</strong></td>
                    <td><Input type="time" value={h.open} style={{ width: 130 }}
                      onChange={e => patch({ open: e.target.value })} /></td>
                    <td><Input type="time" value={h.close} style={{ width: 130 }}
                      onChange={e => patch({ close: e.target.value })} /></td>
                    <td><Switch checked={h.closed} onChange={v => patch({ closed: v })} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ marginTop: 'var(--sk-space-6)' }}>
        <Card title="Fermetures exceptionnelles">
          <div className="sk-stack">
            <div className="sk-row sk-row-wrap">
              <Field label="Du"><Input type="date" value={closure.from}
                onChange={e => setClosure(c => ({ ...c, from: e.target.value }))} /></Field>
              <Field label="Au"><Input type="date" value={closure.to}
                onChange={e => setClosure(c => ({ ...c, to: e.target.value }))} /></Field>
              <Field label="Motif"><Input value={closure.reason} placeholder="Congés annuels"
                onChange={e => setClosure(c => ({ ...c, reason: e.target.value }))} /></Field>
              <Button onClick={() => {
                if (!closure.from || !closure.to) {
                  toast({ tone: 'danger', title: 'Dates obligatoires' })
                  return
                }
                addClosure(closure.from, closure.to, closure.reason || 'Fermeture')
                setClosure({ from: '', to: '', reason: '' })
                toast({ tone: 'success', title: 'Fermeture ajoutée' })
              }}>Ajouter</Button>
            </div>
            {s.closures.length === 0 ? (
              <p className="sk-text-sm sk-dim">Aucune fermeture programmée.</p>
            ) : s.closures.map(c => (
              <div key={c.id} className="sk-row sk-row-between" style={{
                padding: 'var(--sk-space-3)',
                background: 'var(--sk-bg-surface-sunken)',
                borderRadius: 'var(--sk-radius-sm)',
              }}>
                <span className="sk-text-sm">
                  <strong>{c.reason}</strong> — du {new Date(c.from).toLocaleDateString('fr-FR')}
                  {' au '}{new Date(c.to).toLocaleDateString('fr-FR')}
                </span>
                <Button variant="ghost" size="sm" onClick={() => {
                  removeClosure(c.id)
                  toast({ tone: 'info', title: 'Fermeture supprimée' })
                }}>Retirer</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="sk-grid sk-grid-2" style={{ marginTop: 'var(--sk-space-6)' }}>
        <Card title="Textes légaux">
          <div className="sk-stack">
            {field('legalTerms', 'Conditions générales', { area: true })}
            {field('privacyPolicy', 'Politique de confidentialité', { area: true })}
          </div>
        </Card>
        <Card title="Zone de danger">
          <div className="sk-stack">
            <Notice tone="warning">
              La réinitialisation globale est désactivée pour préserver les données de la boutique.
            </Notice>
            <Button disabled variant="destructive" onClick={() => setConfirmReset(true)}>
              Réinitialiser les données
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset} onClose={() => setConfirmReset(false)}
        onConfirm={() => { resetAll(); toast({ tone: 'danger', title: 'Données réinitialisées' }) }}
        title="Réinitialiser toutes les données ?"
        message="Le catalogue, les sections du site et les paramètres reviendront à leur état d’origine. Cette action est irréversible."
        confirmLabel="Réinitialiser"
      />
    </>
  )
}

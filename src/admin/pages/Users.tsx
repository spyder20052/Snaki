// Utilisateurs et roles : quatre roles predefinis avec leurs permissions.
//
// Rappel important affiche dans la page : masquer un bouton cote navigateur
// n'est PAS une securite. Les memes regles devront etre appliquees cote
// serveur (Row Level Security Supabase), sans quoi une requete directe
// contournerait tout.

import { PageHead } from '../AdminApp'
import { ROLES, formatDate, useData } from '../store'
import type { Permission } from '../types'
import { Badge, Card, Notice } from '../ui'

const PERMISSION_LABELS: Record<Permission, string> = {
  'orders.view': 'Voir les commandes',
  'orders.edit': 'Modifier les commandes',
  'orders.refund': 'Rembourser',
  'products.view': 'Voir les produits',
  'products.edit': 'Modifier les produits',
  'content.edit': 'Modifier le site',
  'media.edit': 'Gérer les médias',
  'customers.view': 'Voir les clients',
  'finance.view': 'Voir les finances',
  'promotions.edit': 'Gérer les promotions',
  'analytics.view': 'Voir les statistiques',
  'settings.edit': 'Modifier les paramètres',
  'users.manage': 'Gérer les utilisateurs',
}

const ALL = Object.keys(PERMISSION_LABELS) as Permission[]

export function UsersPage() {
  const d = useData()

  return (
    <>
      <PageHead
        title="Utilisateurs & rôles"
        subtitle="Quatre rôles prédéfinis. Le Super Admin dispose de toutes les permissions."
      />

      <div style={{ marginBottom: 'var(--sk-space-6)' }}>
        <Notice tone="warning">
          <strong>Accès protégé par votre compte administrateur.</strong>
          <p className="sk-text-sm" style={{ margin: '6px 0 0' }}>
            Les comptes affichés proviennent de Supabase. Les permissions de chaque rôle sont vérifiées par la base de données.
          </p>
        </Notice>
      </div>

      <Card title="Comptes" padded={false}>
        <table className="sk-table">
          <thead>
            <tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>État</th><th>Créé le</th></tr>
          </thead>
          <tbody>
            {d.users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td className="sk-text-sm sk-muted">{u.email}</td>
                <td><Badge tone="brand">{ROLES.find(r => r.name === u.role)?.label}</Badge></td>
                <td>
                  <Badge tone={u.active ? 'success' : 'neutral'} dot>
                    {u.active ? 'Actif' : 'Désactivé'}
                  </Badge>
                </td>
                <td className="sk-text-xs sk-dim">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop: 'var(--sk-space-6)' }}>
        <Card title="Matrice des permissions" padded={false}>
          <div className="sk-table-wrap" style={{ border: 0 }}>
            <table className="sk-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  {ROLES.map(r => <th key={r.name} style={{ textAlign: 'center' }}>{r.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {ALL.map(p => (
                  <tr key={p}>
                    <td className="sk-text-sm">{PERMISSION_LABELS[p]}</td>
                    {ROLES.map(r => (
                      <td key={r.name} style={{ textAlign: 'center' }}>
                        {r.permissions.includes(p)
                          ? <span style={{ color: 'var(--sk-success-fg)', fontWeight: 700 }}>✓</span>
                          : <span className="sk-dim">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}

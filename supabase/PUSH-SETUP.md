# Notifications push — mise en service

Tout le code est écrit. Il reste trois commandes à lancer, une fois.

---

## Ce que tu dois faire

### 1. Créer les tables

Dans Supabase → **SQL Editor**, exécute [`push-notifications.sql`](push-notifications.sql).

Ça crée `push_subscriptions` (les abonnements des clients), `push_queue` (la file d'envoi) et le déclencheur qui met un message en file à chaque étape clé d'une commande.

### 2. Déployer la fonction d'envoi

```bash
npx supabase login
npx supabase link --project-ref TON_REF_PROJET
npx supabase functions deploy send-push
```

Le `REF_PROJET` est dans l'URL de ton tableau de bord Supabase : `https://supabase.com/dashboard/project/`**`xxxxxxxx`**.

### 3. Enregistrer les clés

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY=BF8DznYXrCsNbNco3fP75viMeIse1-EC-9-7-lbv_UDFdvHq2_HPdDTyB_6CKsHKQb2SNMV8oEBx4wQ6p0nf-5A \
  VAPID_PRIVATE_KEY=nVZIb1LnkS7jVS41uwEHx3YjpgwpT82Caepu0gtgvvk \
  VAPID_SUBJECT=mailto:contactsnaki@gmail.com
```

**La clé privée ci-dessus ne doit jamais aller ailleurs que dans cette commande.** Si elle fuite, n'importe qui peut envoyer des notifications à tes clients : il faudra alors régénérer la paire.

La clé publique est déjà dans `.env.local` — elle est publique par conception, c'est normal.

### 4. Déclencher l'envoi toutes les minutes

Dans Supabase → **SQL Editor** :

```sql
select cron.schedule(
  'send-push-queue',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://TON_REF_PROJET.supabase.co/functions/v1/send-push',
    headers := '{"Authorization": "Bearer TA_CLE_SERVICE_ROLE"}'::jsonb
  );
  $$
);
```

La clé `service_role` est dans **Settings → API**. Elle contourne le RLS, donc elle ne doit jamais apparaître côté site.

---

## Vérifier que ça marche

1. Ouvre le site public, autorise les notifications quand on te le demande.
2. Vérifie l'abonnement :
   ```sql
   select phone, active, created_at from push_subscriptions order by created_at desc;
   ```
3. Passe une commande de test, puis change son statut vers **Confirmée** dans le dashboard.
4. Regarde la file :
   ```sql
   select status, title, body, error, sent_at from push_queue order by created_at desc limit 5;
   ```
   - `pending` → le cron n'est pas encore passé (attends une minute)
   - `sent` → envoyé
   - `skipped` → le client n'a pas autorisé les notifications
   - `failed` → la colonne `error` dit pourquoi

---

## Les deux limites à connaître

**Sur iPhone**, Safari n'autorise le push que si le client a d'abord ajouté le site à son écran d'accueil (*Partager › Sur l'écran d'accueil*). C'est une contrainte d'Apple. Le code détecte ce cas et affiche l'explication, mais on ne peut pas la contourner.

Vu que tes clients sont majoritairement sur mobile, **garde WhatsApp comme canal principal** : le bouton pré-rédigé du dashboard touche tout le monde, sans autorisation ni installation. Le push est un bonus pour ceux qui l'acceptent.

**Le client doit autoriser.** S'il refuse, seul lui peut revenir en arrière dans les réglages de son navigateur — aucun code ne peut réafficher la demande.

---

## Ce qui se passe automatiquement, ensuite

Quand une commande change d'état, le déclencheur SQL met un message en file pour les **étapes clés** uniquement :

| État | Message au client |
|---|---|
| Confirmée | « votre commande #S… est confirmée. Nous la préparons ! » |
| En préparation | « Votre commande #S… est en préparation 🧋 » |
| En livraison | « Votre commande #S… arrive. Notre livreur est en chemin. » |
| Livrée | « Votre commande #S… a été livrée. Merci et à bientôt ! » |
| Annulée | « Votre commande #S… a été annulée. Motif : … » |

`Prête` et `Terminée` ne notifient pas : elles n'apportent rien au client et multiplier les messages finit par lasser.

Les messages successifs d'une même commande **se remplacent** sur l'écran du client (grâce au `tag` du service worker) au lieu de s'empiler.

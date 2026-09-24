-- ===========================================================================
-- SNAKI — NOTIFICATIONS PUSH AUX CLIENTS
-- ===========================================================================
-- A executer dans l'editeur SQL de Supabase, apres schema.sql.
--
-- Ce fichier pose les FONDATIONS cote base. L'envoi lui-meme demande une
-- Edge Function (voir la note en bas), parce que signer un message push
-- exige une cle privee VAPID : dans le navigateur elle serait publique,
-- donc n'importe qui pourrait envoyer des notifications a vos clients.
--
-- Fonctionnement du push web, en trois temps :
--   1. Le client autorise les notifications sur le site (comme une appli).
--   2. Son navigateur renvoie un « abonnement » : une URL unique + deux
--      cles de chiffrement. On le stocke ici.
--   3. Quand une commande change d'etat, le serveur signe un message avec
--      la cle privee VAPID et l'envoie a cette URL.

-- --- ABONNEMENTS -----------------------------------------------------------
-- Un client peut avoir plusieurs abonnements (telephone + ordinateur), d'ou
-- l'absence d'unicite sur `customer_id`.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  -- Le telephone sert de rattachement quand le client n'a pas encore de
  -- fiche : a la premiere commande, on relie l'abonnement a son compte.
  phone       text,
  -- URL fournie par le navigateur (Google, Apple, Mozilla selon le cas).
  endpoint    text not null unique,
  -- Cles de chiffrement du navigateur. Elles ne permettent PAS de lire les
  -- donnees du client : elles servent uniquement a chiffrer le message.
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  -- Desactive automatiquement quand le service push repond 404 ou 410
  -- (abonnement expire ou revoque par le client).
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_customer_idx
  on push_subscriptions(customer_id) where active;
create index if not exists push_subscriptions_phone_idx
  on push_subscriptions(phone) where active;

-- --- FILE D'ENVOI ----------------------------------------------------------
-- Les notifications ne sont pas envoyees directement par le trigger : on les
-- met en file, et l'Edge Function les depile. Ainsi un service push
-- indisponible ne fait jamais echouer la mise a jour d'une commande.

create table if not exists push_queue (
  id          bigserial primary key,
  order_id    uuid references orders(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  phone       text,
  title       text not null,
  body        text not null,
  -- Lien ouvert au clic sur la notification.
  url         text default '/',
  status      text not null default 'pending'
                check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts    integer not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists push_queue_pending_idx
  on push_queue(created_at) where status = 'pending';

-- --- MISE EN FILE AUTOMATIQUE ---------------------------------------------
-- Les etapes cles seulement : `ready` et `completed` sont exclus, ils
-- n'apportent rien au client et multiplier les messages finit par lasser.

-- `security definer` est INDISPENSABLE ici. La table `push_queue` n'a
-- volontairement aucune politique d'insertion (personne ne doit pouvoir
-- fabriquer une notification a la main). Sans `security definer`, le
-- declencheur ecrit avec les droits de l'appelant, l'insertion est refusee,
-- et comme il s'execute DANS la transaction, son echec annule aussi le
-- changement de statut de la commande. C'est exactement le meme piege que
-- celui corrige dans `fix-order-status.sql`.
create or replace function queue_order_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  first_name text;
  msg_title  text;
  msg_body   text;
begin
  -- Rien a faire si le statut n'a pas change.
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Prenom seul : plus naturel dans une notification courte.
  first_name := split_part(coalesce(new.customer_name, ''), ' ', 1);

  case new.status
    when 'confirmed' then
      msg_title := 'Commande confirmée';
      msg_body  := format('%s, votre commande %s est confirmée. Nous la préparons.',
                          first_name, new.reference);
    when 'preparing' then
      msg_title := 'En préparation';
      msg_body  := format('Votre commande %s est en préparation.', new.reference);
    when 'delivering' then
      msg_title := 'En route';
      msg_body  := format('Votre commande %s arrive. Notre livreur est en chemin.',
                          new.reference);
    when 'delivered' then
      msg_title := 'Commande livrée';
      msg_body  := format('Votre commande %s a été livrée. Merci et à bientôt.',
                          new.reference);
    when 'cancelled' then
      msg_title := 'Commande annulée';
      msg_body  := format('Votre commande %s a été annulée.%s', new.reference,
                          case when new.cancel_reason is not null
                               then ' Motif : ' || new.cancel_reason else '' end);
    else
      -- Tout autre statut : pas de notification.
      return new;
  end case;

  insert into push_queue (order_id, customer_id, phone, title, body, url)
  values (new.id, new.customer_id, new.customer_phone, msg_title, msg_body, '/');

  return new;
end;
$$;

drop trigger if exists orders_push_trigger on orders;
create trigger orders_push_trigger
  after update on orders
  for each row execute function queue_order_notification();

-- --- SECURITE --------------------------------------------------------------

alter table push_subscriptions enable row level security;
alter table push_queue enable row level security;

-- Le visiteur peut enregistrer SON abonnement (il ne peut rien lire en
-- retour : sans politique de lecture, la table est invisible cote public).
drop policy if exists "anyone subscribes to push" on push_subscriptions;
create policy "anyone subscribes to push" on push_subscriptions
  for insert with check (true);

-- L'equipe consulte les abonnements et la file.
drop policy if exists "staff reads subscriptions" on push_subscriptions;
create policy "staff reads subscriptions" on push_subscriptions
  for select using (is_staff());

drop policy if exists "staff manages subscriptions" on push_subscriptions;
create policy "staff manages subscriptions" on push_subscriptions
  for update using (is_staff());

drop policy if exists "staff reads push queue" on push_queue;
create policy "staff reads push queue" on push_queue
  for select using (is_staff());

-- ===========================================================================
-- CE QU'IL RESTE A FAIRE POUR ENVOYER REELLEMENT
-- ===========================================================================
-- 1. Generer une paire de cles VAPID (une seule fois) :
--
--      npx web-push generate-vapid-keys
--
--    La cle PUBLIQUE va dans `.env.local` (VITE_VAPID_PUBLIC_KEY) : elle est
--    destinee au navigateur. La cle PRIVEE va dans les secrets Supabase et
--    ne doit JAMAIS se trouver dans le code du site.
--
-- 2. Deployer une Edge Function qui depile `push_queue`, signe chaque
--    message avec la cle privee et l'envoie a l'endpoint du navigateur :
--
--      supabase functions deploy send-push
--      supabase secrets set VAPID_PRIVATE_KEY=...
--
-- 3. La declencher toutes les minutes (Supabase Cron) ou via un webhook sur
--    l'insertion dans `push_queue`.
--
-- LIMITE IMPORTANTE SUR IPHONE : Safari n'autorise le push que si le client
-- a d'abord ajoute le site a son ecran d'accueil (Partager > Sur l'écran
-- d'accueil). Sans cela, aucune notification ne lui parviendra. C'est une
-- contrainte d'Apple, pas un defaut de configuration. Prevoir donc WhatsApp
-- comme canal de repli, qui touche tout le monde.

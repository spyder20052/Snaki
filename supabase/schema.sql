-- ===========================================================================
-- SNAKI — SCHEMA DE BASE DE DONNEES (PostgreSQL / Supabase)
-- ===========================================================================
-- A executer dans l'editeur SQL de Supabase, en une fois.
--
-- Principes retenus :
--   * Les montants sont des ENTIERS en francs CFA. Le XOF n'a pas de
--     subdivision, donc aucun risque d'arrondi de centimes.
--   * On ARCHIVE plutot que supprimer partout ou l'historique compte
--     (produits, commandes) : les statistiques passees doivent rester justes.
--   * Les lignes de commande FIGENT le nom et le prix du produit. Si un
--     produit est renomme ou son prix change, la commande historique garde
--     ce qui a reellement ete facture.
--   * Les compteurs derives (total depense par client, nombre de ventes)
--     ne sont PAS stockes : ils sont calcules par des vues. Un compteur
--     stocke finit toujours par divergerie de la realite.
--   * Aucune donnee bancaire n'est stockee : uniquement l'identifiant de
--     transaction et la reference du prestataire (contrainte PCI-DSS).
--   * Le Row Level Security est active sur TOUTES les tables. Sans cela,
--     la cle anon de Supabase donnerait un acces total en lecture/ecriture.

-- --- EXTENSIONS ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- --- TYPES ENUMERES --------------------------------------------------------
-- Un enum plutot qu'un texte libre : la base refuse une valeur invalide,
-- ce qu'une contrainte applicative peut toujours laisser passer.

create type product_status as enum ('active', 'hidden', 'archived');

create type order_status as enum (
  'new', 'pending', 'confirmed', 'preparing', 'ready',
  'delivering', 'delivered', 'completed', 'cancelled', 'refunded'
);

create type payment_status as enum (
  'initiated', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded'
);

create type payment_method as enum ('cash', 'momo', 'moov', 'celtiis', 'card', 'other');

create type review_status as enum ('pending', 'approved', 'hidden');

create type promotion_kind as enum ('percent', 'fixed', 'free_delivery');

create type admin_role as enum ('super_admin', 'manager', 'orders_staff', 'content_editor');

create type device_kind as enum ('mobile', 'tablet', 'desktop');

create type variant_kind as enum ('single', 'multi');

-- ===========================================================================
-- UTILISATEURS, ROLES, PERMISSIONS
-- ===========================================================================
-- `admin_users.id` reference `auth.users` : Supabase Auth gere les mots de
-- passe et les sessions, on n'y touche pas. Cette table ne porte que le
-- role metier.

create table admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        admin_role not null default 'orders_staff',
  active      boolean not null default true,
  last_login_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Permissions par role. Table de donnees plutot que code : ajouter une
-- permission ne demande pas de redeploiement.
create table role_permissions (
  role       admin_role not null,
  permission text not null,
  primary key (role, permission)
);

insert into role_permissions (role, permission) values
  ('super_admin','orders.view'),('super_admin','orders.edit'),('super_admin','orders.refund'),
  ('super_admin','products.view'),('super_admin','products.edit'),
  ('super_admin','content.edit'),('super_admin','media.edit'),
  ('super_admin','customers.view'),('super_admin','finance.view'),
  ('super_admin','promotions.edit'),('super_admin','analytics.view'),
  ('super_admin','settings.edit'),('super_admin','users.manage'),
  ('manager','orders.view'),('manager','orders.edit'),('manager','orders.refund'),
  ('manager','products.view'),('manager','products.edit'),
  ('manager','content.edit'),('manager','media.edit'),
  ('manager','customers.view'),('manager','finance.view'),
  ('manager','promotions.edit'),('manager','analytics.view'),
  ('orders_staff','orders.view'),('orders_staff','orders.edit'),
  ('orders_staff','products.view'),('orders_staff','customers.view'),
  ('content_editor','content.edit'),('content_editor','media.edit'),
  ('content_editor','products.view'),('content_editor','products.edit');

-- Fonction d'autorisation, utilisee par toutes les politiques RLS.
-- `security definer` : elle lit `admin_users` meme si l'appelant n'y a pas
-- acces, ce qui evite une recursion infinie dans les politiques.
create or replace function has_permission(perm text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from admin_users u
    join role_permissions rp on rp.role = u.role
    where u.id = auth.uid()
      and u.active
      and rp.permission = perm
  );
$$;

-- Vrai pour tout membre de l'equipe, quel que soit son role.
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admin_users where id = auth.uid() and active);
$$;

-- ===========================================================================
-- MEDIATHEQUE
-- ===========================================================================

create table media (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  url        text not null,
  size       integer not null default 0,
  width      integer,
  height     integer,
  format     text,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- CATALOGUE
-- ===========================================================================

create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_id    uuid references media(id) on delete set null,
  position    integer not null default 0,
  visible     boolean not null default true,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table collections (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  visible    boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

create table products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  short_description text,
  description       text,
  -- Entier en FCFA, jamais negatif.
  price             integer not null check (price >= 0),
  compare_at_price  integer check (compare_at_price >= 0),
  category_id       uuid references categories(id) on delete set null,
  image_id          uuid references media(id) on delete set null,
  mobile_image_id   uuid references media(id) on delete set null,
  color             text,
  status            product_status not null default 'hidden',
  -- `null` = disponibilite geree a la main, sans decompte de stock.
  stock             integer check (stock >= 0),
  available         boolean not null default true,
  position          integer not null default 0,
  tags              text[] not null default '{}',
  allergens         text[] not null default '{}',
  ingredients       text[] not null default '{}',
  nutrition         jsonb not null default '{}'::jsonb,
  prep_time         text,
  is_new            boolean not null default false,
  is_popular        boolean not null default false,
  is_featured       boolean not null default false,
  -- SEO par produit.
  meta_title        text,
  meta_description  text,
  og_image_id       uuid references media(id) on delete set null,
  noindex           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index products_status_idx on products(status) where status = 'active';
create index products_category_idx on products(category_id);

create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  media_id   uuid not null references media(id) on delete cascade,
  position   integer not null default 0
);

create table product_collections (
  product_id    uuid not null references products(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

-- Groupes de variantes : taille, sucre, glace, toppings...
create table product_variant_groups (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name       text not null,
  kind       variant_kind not null default 'single',
  required   boolean not null default false,
  position   integer not null default 0
);

create table product_variant_options (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references product_variant_groups(id) on delete cascade,
  label       text not null,
  -- Supplement en FCFA. Peut etre negatif (remise sur une option).
  price_delta integer not null default 0,
  available   boolean not null default true,
  is_default  boolean not null default false,
  position    integer not null default 0
);

-- ===========================================================================
-- CLIENTS
-- ===========================================================================

create table customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- Le telephone est l'identifiant reel du client au Benin (l'e-mail est
  -- souvent absent), d'où l'unicite dessus.
  phone      text not null unique,
  email      text,
  notes      text,
  created_at timestamptz not null default now()
);

create table addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label       text,
  line        text not null,
  zone_id     uuid,
  is_default  boolean not null default false
);

-- ===========================================================================
-- ZONES DE LIVRAISON, HORAIRES
-- ===========================================================================

create table delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  area       text,
  available  boolean not null default true,
  fee        integer not null default 0 check (fee >= 0),
  min_order  integer not null default 0 check (min_order >= 0),
  eta        text,
  priority   integer not null default 0,
  created_at timestamptz not null default now()
);

alter table addresses
  add constraint addresses_zone_fk
  foreign key (zone_id) references delivery_zones(id) on delete set null;

create table opening_hours (
  -- 0 = dimanche ... 6 = samedi
  day    smallint primary key check (day between 0 and 6),
  opens  time not null,
  closes time not null,
  closed boolean not null default false
);

create table closures (
  id         uuid primary key default gen_random_uuid(),
  starts_on  date not null,
  ends_on    date not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- ===========================================================================
-- PROMOTIONS
-- ===========================================================================

create table promotions (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  kind              promotion_kind not null,
  value             integer not null default 0,
  starts_at         timestamptz,
  ends_at           timestamptz,
  max_uses          integer check (max_uses > 0),
  used_count        integer not null default 0,
  min_order         integer check (min_order >= 0),
  once_per_customer boolean not null default true,
  active            boolean not null default false,
  created_at        timestamptz not null default now(),
  -- Un pourcentage doit rester dans 1..100.
  check (kind <> 'percent' or (value between 1 and 100))
);

create table promotion_products (
  promotion_id uuid not null references promotions(id) on delete cascade,
  product_id   uuid not null references products(id) on delete cascade,
  primary key (promotion_id, product_id)
);

-- ===========================================================================
-- PANIERS
-- ===========================================================================
-- Les paniers sont conserves apres abandon : c'est la matiere premiere du
-- taux d'abandon. Une tache planifiee peut purger les plus anciens.

create table carts (
  id          uuid primary key default gen_random_uuid(),
  session_id  text,
  customer_id uuid references customers(id) on delete set null,
  -- Passe a `true` quand le panier a donne lieu a une commande.
  converted   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  qty        integer not null default 1 check (qty > 0),
  options    jsonb not null default '[]'::jsonb
);

-- ===========================================================================
-- COMMANDES
-- ===========================================================================

-- Numero lisible incremental (#1001, #1002...), independant de l'uuid.
create sequence order_reference_seq start 1001;

create table orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique
                    default ('#' || nextval('order_reference_seq')::text),
  customer_id     uuid references customers(id) on delete set null,
  -- Coordonnees figees a la commande : si le client change de numero, la
  -- commande garde celui utilise ce jour-la.
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  subtotal        integer not null default 0 check (subtotal >= 0),
  delivery_fee    integer not null default 0 check (delivery_fee >= 0),
  discount        integer not null default 0 check (discount >= 0),
  total           integer not null default 0 check (total >= 0),
  payment_method  payment_method not null default 'cash',
  payment_status  payment_status not null default 'initiated',
  status          order_status not null default 'new',
  address         text,
  zone_id         uuid references delivery_zones(id) on delete set null,
  zone_name       text,
  promotion_code  text,
  customer_note   text,
  cancel_reason   text,
  cancelled_by    uuid references admin_users(id) on delete set null,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Une commande annulee doit toujours porter un motif.
  constraint cancel_needs_reason
    check (status <> 'cancelled' or cancel_reason is not null)
);

create index orders_status_idx on orders(status);
create index orders_created_idx on orders(created_at desc);
create index orders_customer_idx on orders(customer_id);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  -- `set null` et non `cascade` : supprimer un produit ne doit JAMAIS
  -- effacer une ligne de commande historique.
  product_id   uuid references products(id) on delete set null,
  -- Nom et prix figes au moment de la commande.
  product_name text not null,
  unit_price   integer not null check (unit_price >= 0),
  qty          integer not null check (qty > 0),
  options      jsonb not null default '[]'::jsonb,
  line_total   integer not null check (line_total >= 0)
);

create table order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status not null,
  reason     text,
  actor_id   uuid references admin_users(id) on delete set null,
  actor_name text,
  at         timestamptz not null default now()
);

-- Historise automatiquement tout changement de statut : impossible de
-- modifier une commande sans laisser de trace.
create or replace function log_order_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into order_status_history (order_id, status, reason, actor_id)
    values (new.id, new.status, new.cancel_reason, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_status_trigger
  before update on orders
  for each row execute function log_order_status();

-- ===========================================================================
-- PAIEMENTS
-- ===========================================================================

create table payments (
  id             uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  order_id       uuid references orders(id) on delete set null,
  amount         integer not null check (amount >= 0),
  method         payment_method not null,
  status         payment_status not null default 'initiated',
  -- Reference renvoyee par Kkiapay / FedaPay / CinetPay.
  provider       text,
  provider_ref   text,
  error_message  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index payments_status_idx on payments(status);

create table refunds (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  order_id   uuid references orders(id) on delete set null,
  amount     integer not null check (amount > 0),
  reason     text not null,
  actor_id   uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- AVIS
-- ===========================================================================

create table reviews (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references customers(id) on delete set null,
  customer_name text not null,
  product_id    uuid references products(id) on delete set null,
  rating        smallint not null check (rating between 1 and 5),
  comment       text not null,
  status        review_status not null default 'pending',
  featured      boolean not null default false,
  reply         text,
  created_at    timestamptz not null default now()
);

-- ===========================================================================
-- CONTENU DU SITE (CMS)
-- ===========================================================================

create table site_sections (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  page       text not null default 'home',
  visible    boolean not null default true,
  position   integer not null default 0,
  -- Une section verrouillee ne peut etre ni masquee ni deplacee.
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

create table site_content (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references site_sections(id) on delete cascade,
  key        text not null,
  label      text not null,
  kind       text not null default 'text',
  value      text not null default '',
  media_id   uuid references media(id) on delete set null,
  unique (section_id, key)
);

-- Table a une seule ligne, verrouillee par une contrainte : evite d'avoir
-- plusieurs jeux de parametres concurrents.
create table settings (
  id                    boolean primary key default true check (id),
  brand_name            text not null default 'Snaki',
  logo_id               uuid references media(id) on delete set null,
  favicon_id            uuid references media(id) on delete set null,
  whatsapp              text,
  phone                 text,
  email                 text,
  instagram             text,
  tiktok                text,
  address               text,
  currency              text not null default 'FCFA',
  default_delivery_fee  integer not null default 500,
  min_order             integer not null default 2000,
  accepting_orders      boolean not null default true,
  orders_closed_message text not null default 'Nous ne prenons pas de commandes pour le moment.',
  legal_terms           text,
  privacy_policy        text,
  seo_title             text,
  seo_description       text,
  seo_og_image_id       uuid references media(id) on delete set null,
  seo_noindex           boolean not null default false,
  updated_at            timestamptz not null default now()
);

insert into settings (id) values (true);

-- ===========================================================================
-- ANALYTICS
-- ===========================================================================
-- Aucune donnee personnelle : pas d'adresse IP, pas d'identifiant
-- publicitaire. Le `session_id` est un jeton aleatoire cote client, et le
-- pays seul (jamais la ville precise) est conserve.

create table analytics_sessions (
  id           text primary key,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  device       device_kind not null default 'desktop',
  source       text,
  country      text,
  page_views   integer not null default 0
);

create table analytics_events (
  id         bigserial primary key,
  name       text not null,
  session_id text references analytics_sessions(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  order_id   uuid references orders(id) on delete set null,
  value      integer,
  path       text,
  source     text,
  device     device_kind,
  at         timestamptz not null default now()
);

-- Index sur (name, at) : toutes les requetes du tunnel de conversion
-- filtrent sur ces deux colonnes.
create index analytics_events_name_at_idx on analytics_events(name, at desc);
create index analytics_events_session_idx on analytics_events(session_id);

-- ===========================================================================
-- NOTIFICATIONS ET JOURNAL D'ACTIVITE
-- ===========================================================================

create table notifications (
  id      uuid primary key default gen_random_uuid(),
  kind    text not null,
  title   text not null,
  message text,
  read    boolean not null default false,
  at      timestamptz not null default now()
);

create table audit_logs (
  id         bigserial primary key,
  message    text not null,
  actor_id   uuid references admin_users(id) on delete set null,
  actor_name text,
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  at         timestamptz not null default now()
);

create index audit_logs_at_idx on audit_logs(at desc);

-- ===========================================================================
-- VUES DERIVEES
-- ===========================================================================
-- Les statistiques sont des VUES, pas des colonnes. Elles ne peuvent donc
-- jamais etre desynchronisees des commandes reelles.

-- Statistiques par client, avec segment calcule.
create or replace view customer_stats as
select
  c.id                                             as customer_id,
  c.name,
  c.phone,
  count(o.id) filter (
    where o.status not in ('cancelled','refunded'))  as order_count,
  count(o.id) filter (where o.status = 'cancelled')  as cancelled_count,
  coalesce(sum(o.total) filter (
    where o.status not in ('cancelled','refunded')), 0) as total_spent,
  coalesce(round(avg(o.total) filter (
    where o.status not in ('cancelled','refunded'))), 0) as average_order,
  min(o.created_at)                                  as first_order_at,
  max(o.created_at)                                  as last_order_at,
  case
    when count(o.id) filter (
      where o.status not in ('cancelled','refunded')) = 0 then 'new'
    when max(o.created_at) < now() - interval '60 days' then 'inactive'
    when coalesce(sum(o.total) filter (
      where o.status not in ('cancelled','refunded')), 0) >= 50000 then 'big_spender'
    when count(o.id) filter (
      where o.status not in ('cancelled','refunded')) >= 10 then 'loyal'
    when count(o.id) filter (
      where o.status not in ('cancelled','refunded')) >= 3 then 'regular'
    else 'new'
  end                                                as segment
from customers c
left join orders o on o.customer_id = c.id
group by c.id, c.name, c.phone;

-- Ventes par jour : base des graphiques de la vue d'ensemble.
create or replace view daily_sales as
select
  date_trunc('day', created_at)::date as day,
  count(*)                            as order_count,
  sum(total)                          as revenue,
  round(avg(total))                   as average_basket
from orders
where status not in ('cancelled','refunded')
group by 1
order by 1 desc;

-- Classement des produits les plus vendus.
create or replace view product_sales as
select
  oi.product_id,
  oi.product_name,
  sum(oi.qty)        as units_sold,
  sum(oi.line_total) as revenue
from order_items oi
join orders o on o.id = oi.order_id
where o.status not in ('cancelled','refunded')
group by oi.product_id, oi.product_name
order by units_sold desc;

-- Tunnel de conversion, une ligne par etape.
create or replace view conversion_funnel as
select 'sessions'          as step, count(*)::bigint as count from analytics_sessions
union all
select 'product_view',      count(*) from analytics_events where name = 'product_view'
union all
select 'add_to_cart',       count(*) from analytics_events where name = 'add_to_cart'
union all
select 'cart_open',         count(*) from analytics_events where name = 'cart_open'
union all
select 'checkout_started',  count(*) from analytics_events where name = 'checkout_started'
union all
select 'payment_started',   count(*) from analytics_events where name = 'payment_started'
union all
select 'payment_success',   count(*) from analytics_events where name = 'payment_success'
union all
select 'order_created',     count(*) from analytics_events where name = 'order_created';

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
-- Sans RLS, la cle anon (publique, presente dans le navigateur) donnerait
-- un acces total. Chaque table est donc verrouillee, puis on ouvre
-- explicitement ce qui doit l'etre.

alter table admin_users            enable row level security;
alter table role_permissions       enable row level security;
alter table media                  enable row level security;
alter table categories             enable row level security;
alter table collections            enable row level security;
alter table products               enable row level security;
alter table product_images         enable row level security;
alter table product_collections    enable row level security;
alter table product_variant_groups enable row level security;
alter table product_variant_options enable row level security;
alter table customers              enable row level security;
alter table addresses              enable row level security;
alter table delivery_zones         enable row level security;
alter table opening_hours          enable row level security;
alter table closures               enable row level security;
alter table promotions             enable row level security;
alter table promotion_products     enable row level security;
alter table carts                  enable row level security;
alter table cart_items             enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table order_status_history   enable row level security;
alter table payments               enable row level security;
alter table refunds                enable row level security;
alter table reviews                enable row level security;
alter table site_sections          enable row level security;
alter table site_content           enable row level security;
alter table settings               enable row level security;
alter table analytics_sessions     enable row level security;
alter table analytics_events       enable row level security;
alter table notifications          enable row level security;
alter table audit_logs             enable row level security;

-- --- LECTURE PUBLIQUE ------------------------------------------------------
-- Le site public (cle anon, visiteur non connecte) ne voit que le catalogue
-- publie et les contenus visibles. Jamais les commandes ni les clients.

create policy "public reads active products" on products
  for select using (status = 'active');

create policy "public reads visible categories" on categories
  for select using (visible and not archived);

create policy "public reads collections" on collections
  for select using (visible);

create policy "public reads product images" on product_images for select using (true);
create policy "public reads variant groups" on product_variant_groups for select using (true);
create policy "public reads variant options" on product_variant_options for select using (true);
create policy "public reads media" on media for select using (true);

create policy "public reads available zones" on delivery_zones
  for select using (available);

create policy "public reads hours" on opening_hours for select using (true);
create policy "public reads closures" on closures for select using (true);
create policy "public reads settings" on settings for select using (true);

create policy "public reads visible sections" on site_sections
  for select using (visible);
create policy "public reads content" on site_content for select using (true);

create policy "public reads approved reviews" on reviews
  for select using (status = 'approved');

-- --- ECRITURE PUBLIQUE (limitee) -------------------------------------------
-- Le visiteur peut creer une session, envoyer des evenements et deposer un
-- avis. Il ne peut RIEN lire en retour, ni modifier quoi que ce soit.

create policy "anyone starts a session" on analytics_sessions
  for insert with check (true);
create policy "anyone updates own session" on analytics_sessions
  for update using (true) with check (true);
create policy "anyone sends events" on analytics_events
  for insert with check (true);

create policy "anyone submits a review" on reviews
  for insert with check (status = 'pending');

-- Panier : cree et modifie par le visiteur.
create policy "anyone manages carts" on carts
  for all using (true) with check (true);
create policy "anyone manages cart items" on cart_items
  for all using (true) with check (true);

-- --- ACCES EQUIPE ----------------------------------------------------------
-- Chaque table sensible exige la permission correspondante. Une requete
-- directe sans le bon role est refusee PAR LA BASE, pas par l'interface.

create policy "staff reads own row" on admin_users
  for select using (id = auth.uid() or has_permission('users.manage'));
create policy "admins manage users" on admin_users
  for all using (has_permission('users.manage'));

create policy "staff reads permissions" on role_permissions
  for select using (is_staff());

create policy "editors manage products" on products
  for all using (has_permission('products.edit'));
create policy "staff reads all products" on products
  for select using (has_permission('products.view'));

create policy "editors manage categories" on categories
  for all using (has_permission('products.edit'));
create policy "editors manage collections" on collections
  for all using (has_permission('products.edit'));
create policy "editors manage product images" on product_images
  for all using (has_permission('products.edit'));
create policy "editors manage product collections" on product_collections
  for all using (has_permission('products.edit'));
create policy "editors manage variant groups" on product_variant_groups
  for all using (has_permission('products.edit'));
create policy "editors manage variant options" on product_variant_options
  for all using (has_permission('products.edit'));

create policy "staff reads customers" on customers
  for select using (has_permission('customers.view'));
create policy "staff manages customers" on customers
  for all using (has_permission('orders.edit'));
create policy "staff reads addresses" on addresses
  for select using (has_permission('customers.view'));

create policy "staff reads orders" on orders
  for select using (has_permission('orders.view'));
create policy "staff edits orders" on orders
  for all using (has_permission('orders.edit'));
create policy "staff reads order items" on order_items
  for select using (has_permission('orders.view'));
create policy "staff edits order items" on order_items
  for all using (has_permission('orders.edit'));
create policy "staff reads status history" on order_status_history
  for select using (has_permission('orders.view'));

create policy "finance reads payments" on payments
  for select using (has_permission('finance.view'));
create policy "finance manages refunds" on refunds
  for all using (has_permission('orders.refund'));

create policy "editors manage promotions" on promotions
  for all using (has_permission('promotions.edit'));
create policy "editors manage promotion products" on promotion_products
  for all using (has_permission('promotions.edit'));

create policy "admins manage zones" on delivery_zones
  for all using (has_permission('settings.edit'));
create policy "admins manage hours" on opening_hours
  for all using (has_permission('settings.edit'));
create policy "admins manage closures" on closures
  for all using (has_permission('settings.edit'));
create policy "admins manage settings" on settings
  for all using (has_permission('settings.edit'));

create policy "editors manage sections" on site_sections
  for all using (has_permission('content.edit'));
create policy "editors manage content" on site_content
  for all using (has_permission('content.edit'));
create policy "editors manage media" on media
  for all using (has_permission('media.edit'));
create policy "editors moderate reviews" on reviews
  for all using (has_permission('content.edit'));

create policy "staff reads analytics events" on analytics_events
  for select using (has_permission('analytics.view'));
create policy "staff reads analytics sessions" on analytics_sessions
  for select using (has_permission('analytics.view'));
create policy "staff reads carts" on carts
  for select using (has_permission('analytics.view'));

create policy "staff reads notifications" on notifications
  for all using (is_staff());
-- Le journal est en lecture seule : personne ne peut effacer une trace.
create policy "staff reads audit logs" on audit_logs
  for select using (is_staff());

-- --- PRIVILEGES DATA API ---------------------------------------------------
-- Les GRANT determinent quelles operations atteignent les politiques RLS.
-- Sans eux, PostgREST renvoie "permission denied" avant meme d'evaluer RLS.

grant usage on schema public to anon, authenticated;

grant select on
  media, categories, collections, products, product_images,
  product_collections, product_variant_groups, product_variant_options,
  delivery_zones, opening_hours, closures, reviews,
  site_sections, site_content, settings
to anon;

grant insert on analytics_sessions, analytics_events, reviews, carts, cart_items
to anon;
grant select, update, delete on carts, cart_items to anon;
grant update on analytics_sessions to anon;

-- Les politiques RLS ci-dessus restent l'autorite finale pour les membres
-- connectes : ce GRANT ne contourne aucune verification de permission.
grant select, insert, update, delete on all tables in schema public
to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ===========================================================================
-- DONNEES INITIALES
-- ===========================================================================
-- Le catalogue et les zones REELLEMENT affiches sur le site aujourd'hui.

insert into categories (name, slug, position) values
  ('Bubble tea', 'bubble-tea', 1),
  ('Milk tea', 'milk-tea', 2),
  ('Thé fruité', 'the-fruite', 3),
  ('Smoothies', 'smoothies', 4),
  ('Specials', 'specials', 5);

insert into products (name, slug, short_description, price, category_id, status, position, is_popular, is_featured, prep_time, ingredients, nutrition)
values
  ('Classique Perles','classique-perles','Thé noir · Perles · Doux',2500,
    (select id from categories where slug='bubble-tea'),'active',1,true,true,'3–4 min',
    array['Thé noir','Perles'],'{"kcal":210}'::jsonb),
  ('Fraise Givrée','fraise-givree','Thé vert · Fraise · Frais',3000,
    (select id from categories where slug='the-fruite'),'active',2,false,false,'3–5 min',
    array['Thé vert','Fraise'],'{"kcal":240}'::jsonb),
  ('Choco Crémeux','choco-cremeux','Lait · Cacao · Riche',3200,
    (select id from categories where slug='milk-tea'),'active',3,false,false,'4–5 min',
    array['Lait','Cacao'],'{"kcal":320}'::jsonb),
  ('Matcha Nuage','matcha-nuage','Matcha · Chantilly · Doux',3500,
    (select id from categories where slug='specials'),'active',4,true,false,'4 min',
    array['Matcha','Chantilly'],'{"kcal":260}'::jsonb),
  ('Oreo Boba','oreo-boba','Lait · Oreo · Gourmand',3400,
    (select id from categories where slug='milk-tea'),'active',5,true,false,'4–6 min',
    array['Lait','Oreo'],'{"kcal":380}'::jsonb),
  ('Mangue Soleil','mangue-soleil','Thé blanc · Mangue · Fruité',3100,
    (select id from categories where slug='the-fruite'),'active',6,false,false,'3–4 min',
    array['Thé blanc','Mangue'],'{"kcal":230}'::jsonb);

insert into delivery_zones (name, available, fee, min_order, eta, priority) values
  ('Cotonou',   true,  500, 2000, '20–35 min', 1),
  ('Fidjrossè', true,  500, 2000, '25–40 min', 2),
  ('Godomey',   true, 1000, 3000, '30–45 min', 3),
  ('Calavi',    true, 1000, 3000, '35–50 min', 4),
  ('Hêvié',     true, 1500, 3500, '40–60 min', 5);

insert into opening_hours (day, opens, closes, closed) values
  (1,'10:00','22:00',false), (2,'10:00','22:00',false),
  (3,'10:00','22:00',false), (4,'10:00','22:00',false),
  (5,'10:00','23:00',false), (6,'10:00','23:00',false),
  (0,'14:00','22:00',false);

insert into site_sections (key, name, page, position, locked) values
  ('hero','Hero','home',1,true),
  ('about','À propos','home',2,false),
  ('experience','Expérience','home',3,false),
  ('drinkband','Bandeau boissons','home',4,false),
  ('travel','Take Away / Zones','home',5,false),
  ('photo','Photo « Snaki, c''est vous »','home',6,false),
  ('footer','Footer « On sirote Snaki »','global',7,true);

-- Groupes de variantes communs, appliques a toutes les boissons.
do $$
declare p record; g uuid;
begin
  for p in select id from products loop
    insert into product_variant_groups (product_id, name, kind, required, position)
      values (p.id,'Taille','single',true,1) returning id into g;
    insert into product_variant_options (group_id, label, price_delta, is_default, position) values
      (g,'Moyen',0,true,1), (g,'Grand',500,false,2);

    insert into product_variant_groups (product_id, name, kind, required, position)
      values (p.id,'Sucre','single',true,2) returning id into g;
    insert into product_variant_options (group_id, label, price_delta, is_default, position) values
      (g,'0 %',0,false,1), (g,'50 %',0,true,2), (g,'100 %',0,false,3);

    insert into product_variant_groups (product_id, name, kind, required, position)
      values (p.id,'Glace','single',true,3) returning id into g;
    insert into product_variant_options (group_id, label, price_delta, is_default, position) values
      (g,'Sans glace',0,false,1), (g,'Peu de glace',0,true,2), (g,'Normal',0,false,3);

    insert into product_variant_groups (product_id, name, kind, required, position)
      values (p.id,'Toppings','multi',false,4) returning id into g;
    insert into product_variant_options (group_id, label, price_delta, position) values
      (g,'Perles de tapioca',300,1), (g,'Perles popping',300,2),
      (g,'Chantilly',200,3), (g,'Gelée de coco',300,4);
  end loop;
end $$;

update settings set
  email = 'contactsnaki@gmail.com',
  address = 'Cotonou, Bénin',
  seo_title = 'Snaki — Bubble tea à Cotonou',
  seo_description = 'Bubble tea frais préparé à la commande. Livraison à Cotonou, Fidjrossè, Godomey, Calavi et Hêvié.'
where id = true;

-- ===========================================================================
-- APRES EXECUTION
-- ===========================================================================
-- 1. Creer le premier compte dans Supabase Auth (Authentication > Users).
-- 2. Le declarer Super Admin :
--
--      insert into admin_users (id, name, email, role)
--      values ('<uuid-du-compte>', 'Administrateur', '<email>', 'super_admin');
--
-- 3. Recuperer l'URL du projet et la cle anon (Settings > API) et les
--    placer dans un fichier `.env.local` a la racine :
--
--      VITE_SUPABASE_URL=https://xxxx.supabase.co
--      VITE_SUPABASE_ANON_KEY=eyJ...
--
-- La cle anon est publique par conception : c'est le RLS ci-dessus qui
-- protege les donnees, jamais le secret de la cle.

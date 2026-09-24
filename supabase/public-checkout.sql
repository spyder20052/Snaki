-- ===========================================================================
-- SNAKI — COMMANDES DEPUIS LE SITE PUBLIC
-- ===========================================================================
-- A executer dans le SQL Editor, apres schema.sql.
--
-- Permet au site public d'enregistrer une commande en base, ce qu'il ne
-- faisait pas jusqu'ici (tout vivait dans `localStorage`).
--
-- Le visiteur n'a AUCUN droit d'ecriture sur `orders`, `customers` ou
-- `payments` : il appelle une fonction qui valide et ecrit a sa place. Sans
-- cela, il faudrait lui ouvrir la table `orders` en insertion, et n'importe
-- qui pourrait alors fabriquer des commandes a 0 F ou en modifier d'autres.
--
-- Ce que la fonction verifie AVANT d'ecrire :
--   * la boutique accepte les commandes (interrupteur du dashboard),
--   * chaque produit existe et est bien en vente,
--   * les PRIX viennent de la base, jamais du navigateur,
--   * la zone est desservie et le minimum de commande atteint.

create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  line          jsonb;
  prod          products%rowtype;
  zone          delivery_zones%rowtype;
  cfg           settings%rowtype;
  new_order_id  uuid;
  new_reference text;
  customer_row  customers%rowtype;
  computed_sub  integer := 0;
  line_total    integer;
  line_qty      integer;
  phone_clean   text;
  item_count    integer := 0;
begin
  select * into cfg from settings where id = true;
  if not cfg.accepting_orders then
    raise exception 'Les commandes sont momentanément fermées.';
  end if;

  -- Coordonnees : on refuse une commande sans de quoi joindre le client.
  phone_clean := regexp_replace(coalesce(payload->>'phone', ''), '\D', '', 'g');
  if length(phone_clean) < 8 then
    raise exception 'Numéro de téléphone invalide.';
  end if;
  if coalesce(trim(payload->>'name'), '') = '' then
    raise exception 'Le nom est obligatoire.';
  end if;

  -- Zone de livraison : le site ne doit jamais proposer une zone non
  -- desservie, mais on revalide ici — le navigateur n'est pas une source
  -- de verite.
  if payload ? 'zone_id' and payload->>'zone_id' is not null then
    select * into zone from delivery_zones
     where id = (payload->>'zone_id')::uuid and available;
    if not found then
      raise exception 'Cette zone n''est pas desservie.';
    end if;
  end if;

  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Le panier est vide.';
  end if;

  -- Client : retrouve par telephone, ou cree. Le telephone est
  -- l'identifiant reel au Benin (l'e-mail est souvent absent).
  select * into customer_row from customers where phone = phone_clean;
  if not found then
    insert into customers (name, phone, email)
    values (trim(payload->>'name'), phone_clean, nullif(trim(coalesce(payload->>'email','')), ''))
    returning * into customer_row;
  end if;

  insert into orders (
    customer_id, customer_name, customer_phone, customer_email,
    subtotal, delivery_fee, discount, total,
    payment_method, payment_status, status,
    address, zone_id, zone_name, customer_note
  ) values (
    customer_row.id, trim(payload->>'name'), phone_clean,
    nullif(trim(coalesce(payload->>'email','')), ''),
    0, coalesce(zone.fee, cfg.default_delivery_fee), 0, 0,
    coalesce((payload->>'method')::payment_method, 'cash'),
    'initiated', 'new',
    nullif(trim(coalesce(payload->>'address','')), ''),
    zone.id, zone.name,
    nullif(trim(coalesce(payload->>'note','')), '')
  ) returning id, reference into new_order_id, new_reference;

  -- Lignes de commande. Le prix vient du CATALOGUE, jamais du navigateur :
  -- c'est la seule protection contre une commande fabriquee a 0 F.
  for line in select value from jsonb_array_elements(payload->'items') loop
    select * into prod from products
     where id = (line->>'product_id')::uuid
       and status = 'active' and available;
    if not found then
      raise exception 'Une boisson du panier n''est plus disponible.';
    end if;

    line_qty := greatest(1, least(coalesce((line->>'qty')::integer, 1), 50));
    line_total := prod.price * line_qty;
    computed_sub := computed_sub + line_total;
    item_count := item_count + line_qty;

    insert into order_items (order_id, product_id, product_name, unit_price, qty, options, line_total)
    values (new_order_id, prod.id, prod.name, prod.price, line_qty,
            coalesce(line->'options', '[]'::jsonb), line_total);
  end loop;

  if item_count > 100 then
    raise exception 'Commande trop volumineuse.';
  end if;

  -- Minimum de commande : celui de la zone s'il existe, sinon le global.
  if computed_sub < coalesce(zone.min_order, cfg.min_order) then
    raise exception 'Le minimum de commande est de % F.',
      coalesce(zone.min_order, cfg.min_order);
  end if;

  update orders
     set subtotal = computed_sub,
         total = computed_sub + coalesce(zone.fee, cfg.default_delivery_fee)
   where id = new_order_id;

  -- Paiement : trace de l'intention. Le statut reel viendra du prestataire
  -- (Kkiapay, FedaPay...) une fois l'integration faite. Aucune donnee
  -- bancaire n'est stockee.
  insert into payments (transaction_id, order_id, amount, method, status)
  select 'SNK-' || substr(new_order_id::text, 1, 8) || '-' || extract(epoch from now())::bigint,
         new_order_id, o.total, o.payment_method, 'initiated'
  from orders o where o.id = new_order_id;

  -- Notifie l'equipe dans le dashboard.
  insert into notifications (kind, title, message)
  select 'order', 'Nouvelle commande ' || new_reference,
         trim(payload->>'name') || ' · ' || o.total || ' F'
  from orders o where o.id = new_order_id;

  return jsonb_build_object(
    'id', new_order_id,
    'reference', new_reference,
    'total', (select total from orders where id = new_order_id),
    'customer_id', customer_row.id
  );
end;
$$;

-- Le visiteur anonyme peut passer commande, mais rien d'autre : il n'a
-- aucun droit direct sur les tables.
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- --- SUIVI DE SA PROPRE COMMANDE -------------------------------------------
-- Le client doit pouvoir consulter SES commandes sans voir celles des
-- autres. La fonction filtre sur le telephone fourni.

create or replace function public.my_orders(phone_input text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  phone_clean text := regexp_replace(coalesce(phone_input, ''), '\D', '', 'g');
begin
  if length(phone_clean) < 8 then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select o.id, o.reference, o.status, o.total, o.subtotal, o.delivery_fee,
             o.payment_method, o.payment_status, o.address, o.zone_name,
             o.created_at, o.updated_at,
             (select jsonb_agg(jsonb_build_object(
                'productName', i.product_name, 'qty', i.qty,
                'unitPrice', i.unit_price, 'lineTotal', i.line_total))
              from order_items i where i.order_id = o.id) as items
      from orders o
      where o.customer_phone = phone_clean
      -- Borne raisonnable : au-dela l'espace client devient illisible.
      limit 50
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.my_orders(text) from public;
grant execute on function public.my_orders(text) to anon, authenticated;

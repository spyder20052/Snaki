-- ===========================================================================
-- SNAKI — RETRAIT SUR PLACE
-- ===========================================================================
-- A executer dans le SQL Editor, apres schema.sql et public-checkout.sql.
-- Sans danger a relancer plusieurs fois.
--
-- Deux facons de commander coexistent desormais :
--   - LIVRAISON : un livreur apporte la commande a l'adresse indiquee ;
--   - RETRAIT   : le client commande depuis le site et vient chercher.
--
-- Le retrait change le parcours : la commande ne passe jamais par « En
-- livraison » ni « Livrée ». Une fois prete, le client vient la chercher et
-- elle passe a « Récupérée ». Elle ne supporte aucun frais de livraison.

-- --- 1. NOUVEL ETAT « RECUPEREE » ------------------------------------------
-- `add value if not exists` est indispensable : un enum ne se modifie pas
-- deux fois sans erreur.
alter type order_status add value if not exists 'picked_up' after 'delivered';

-- --- 2. MODE DE REMISE ------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'fulfillment_mode') then
    create type fulfillment_mode as enum ('delivery', 'pickup');
  end if;
end;
$$;

-- Les commandes existantes sont toutes des livraisons : c'est ce qu'elles
-- etaient avant l'ajout du retrait, donc la valeur par defaut est juste.
alter table orders
  add column if not exists fulfillment fulfillment_mode not null default 'delivery';

comment on column orders.fulfillment is
  'Livraison a domicile, ou retrait sur place par le client.';

-- Une commande a retirer n'a ni adresse ni zone ni frais : on le garantit
-- en base plutot que de compter sur l'interface.
alter table orders drop constraint if exists pickup_has_no_delivery;
alter table orders add constraint pickup_has_no_delivery
  check (fulfillment <> 'pickup' or (delivery_fee = 0 and zone_id is null));

-- --- 3. PRISE EN COMPTE DANS `place_order` ---------------------------------
-- La fonction serveur recalcule TOUJOURS les montants : si elle ignorait le
-- mode de remise, elle facturerait une livraison a un client venu chercher
-- sa commande. On la corrige en place, sans la reecrire entierement, pour
-- que les evolutions de public-checkout.sql restent applicables.
--
-- Trois points changent :
--   1. lire `fulfillment` dans le payload ;
--   2. ne pas exiger ni resoudre de zone pour un retrait ;
--   3. mettre les frais de livraison a zero pour un retrait.

do $$
declare
  src text;
begin
  select pg_get_functiondef(oid) into src
  from pg_proc where proname = 'place_order'
  order by oid desc limit 1;

  if src is null then
    raise exception 'La fonction place_order est absente : execute public-checkout.sql avant.';
  end if;

  -- Deja corrigee ? On ne refait rien.
  if position('fulfillment' in src) > 0 then
    raise notice 'place_order gere deja le retrait : rien a faire.';
    return;
  end if;

  -- 1 + 2. La zone n'est resolue que pour une livraison.
  src := replace(src,
    'if payload ? ''zone_id'' and payload->>''zone_id'' is not null then',
    'if coalesce(payload->>''fulfillment'', ''delivery'') <> ''pickup''
     and payload ? ''zone_id'' and payload->>''zone_id'' is not null then');

  -- 3. Les frais : nuls pour un retrait, sinon ceux de la zone.
  src := replace(src,
    '0, coalesce(zone.fee, cfg.default_delivery_fee), 0, 0,',
    '0, case when coalesce(payload->>''fulfillment'', ''delivery'') = ''pickup''
             then 0 else coalesce(zone.fee, cfg.default_delivery_fee) end, 0, 0,');

  src := replace(src,
    'total = computed_sub + coalesce(zone.fee, cfg.default_delivery_fee)',
    'total = computed_sub + case when coalesce(payload->>''fulfillment'', ''delivery'') = ''pickup''
                                 then 0 else coalesce(zone.fee, cfg.default_delivery_fee) end');

  -- Le mode de remise est enregistre sur la commande.
  src := replace(src,
    'address, zone_id, zone_name, customer_note',
    'address, zone_id, zone_name, customer_note, fulfillment');
  src := replace(src,
    'nullif(trim(coalesce(payload->>''note'','''')), '''')
  ) returning id, reference into new_order_id, new_reference;',
    'nullif(trim(coalesce(payload->>''note'','''')), ''''),
    coalesce(payload->>''fulfillment'', ''delivery'')::fulfillment_mode
  ) returning id, reference into new_order_id, new_reference;');

  execute src;
  raise notice 'place_order corrigee : le retrait sur place est pris en compte.';
end;
$$;

-- --- 4. VERIFICATION --------------------------------------------------------
-- Un seul tableau, car le SQL Editor n'affiche que la derniere requete.
select
  'Etat picked_up' as controle,
  case when exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'order_status' and e.enumlabel = 'picked_up')
  then 'present' else 'ABSENT' end as resultat
union all select
  'Colonne fulfillment',
  case when exists (
    select 1 from information_schema.columns
    where table_name = 'orders' and column_name = 'fulfillment')
  then 'presente' else 'ABSENTE' end
union all select
  'place_order gere le retrait',
  case when exists (
    select 1 from pg_proc
    where proname = 'place_order'
      and position('fulfillment' in pg_get_functiondef(oid)) > 0)
  then 'oui' else 'NON' end
union all select
  'Commandes en retrait',
  coalesce((select count(*)::text from orders where fulfillment = 'pickup'), '0');

-- Execute this migration once, after schema.sql. Existing data is preserved.
begin;

-- Views must obey the requesting user's table policies.
alter view public.customer_stats set (security_invoker = true);
alter view public.daily_sales set (security_invoker = true);
alter view public.product_sales set (security_invoker = true);
alter view public.conversion_funnel set (security_invoker = true);

-- The public cart policies previously exposed every cart to everyone.
drop policy if exists "anyone manages carts" on public.carts;
drop policy if exists "anyone manages cart items" on public.cart_items;
drop policy if exists "anyone updates own session" on public.analytics_sessions;
revoke all on public.carts, public.cart_items from anon;

-- The trigger records changes already authorized by orders RLS.
alter function public.log_order_status() security definer;
alter function public.log_order_status() set search_path = public, pg_temp;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Record actual database changes, not optimistic browser notifications.
create or replace function public.admin_audit_change()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare row_data jsonb;
begin
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs(message,actor_id,actor_name,entity,entity_id,action)
  select tg_table_name || ' · ' || lower(tg_op), u.id, u.name, tg_table_name,
    case when row_data->>'id' ~ '^[0-9a-f-]{36}$' then (row_data->>'id')::uuid else null end,
    case tg_op when 'INSERT' then 'create' when 'DELETE' then 'delete' else 'update' end
  from public.admin_users u where u.id=auth.uid() and u.active;
  return null;
end;
$$;
revoke all on function public.admin_audit_change() from public, anon, authenticated;
do $$
declare tbl text;
begin
  foreach tbl in array array['products','categories','media','delivery_zones','promotions','reviews','site_sections','site_content','orders','settings','opening_hours','closures'] loop
    execute format('drop trigger if exists dashboard_audit on public.%I',tbl);
    execute format('create trigger dashboard_audit after insert or update or delete on public.%I for each row execute function public.admin_audit_change()',tbl);
  end loop;
end;
$$;

-- The initial schema creates sections but no editable content fields.
insert into public.site_content(section_id,key,label,kind,value)
select s.id,v.field_key,v.label,v.kind,v.value
from (values
 ('hero','title','Titre','text','SNAKI'),
 ('hero','subtitle','Sous-titre','textarea',''),
 ('hero','cta','Bouton','text','Commander'),
 ('about','intro','Introduction','textarea',''),
 ('experience','title','Titre','text','DRINK GOOD FEEL GOOD'),
 ('travel','eyebrow','Sur-titre','text','TAKE AWAY'),
 ('travel','title','Titre','text','UN BOBA QUI VOYAGE AVEC TOI'),
 ('photo','claim','Accroche','text','Snaki, c’est vous'),
 ('footer','title','Titre','text','SIROTE SNAKI'),
 ('footer','cta','Bouton','text','ON COMMANDE')
) v(section_key,field_key,label,kind,value)
join public.site_sections s on s.key=v.section_key
on conflict(section_id,key) do nothing;

-- Transactional writes. SECURITY INVOKER deliberately preserves table RLS.
create or replace function public.admin_apply_changes(changes jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  change jsonb;
  tbl text;
  operation text;
  payload jsonb;
  col text;
  cols text;
  vals text;
  assignments text;
  predicate text;
  keys text[];
  affected integer;
begin
  if not public.is_staff() then raise exception 'Accès administrateur requis'; end if;
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 2000 then
    raise exception 'Lot de modifications invalide';
  end if;
  for change in select value from jsonb_array_elements(changes) loop
    tbl := change->>'table';
    operation := change->>'op';
    payload := change->'row';
    if tbl <> all(array['products','categories','media','delivery_zones','promotions','reviews','site_sections','site_content','orders','notifications','settings','opening_hours','closures','product_variant_groups','product_variant_options','product_images','product_collections','promotion_products']) then
      raise exception 'Table non autorisée';
    end if;
    keys := case tbl
      when 'opening_hours' then array['day']
      when 'product_collections' then array['product_id','collection_id']
      when 'promotion_products' then array['promotion_id','product_id']
      else array['id'] end;
    cols := ''; vals := ''; assignments := ''; predicate := '';
    for col in select jsonb_object_keys(payload) loop
      if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=tbl and column_name=col) then raise exception 'Colonne inconnue'; end if;
      cols := concat_ws(',',nullif(cols,''),format('%I',col));
      vals := concat_ws(',',nullif(vals,''),format('r.%I',col));
      if col <> all(keys) then assignments := concat_ws(',',nullif(assignments,''),format('%I = r.%I',col,col)); end if;
    end loop;
    foreach col in array keys loop
      if not payload ? col then raise exception 'Identifiant manquant'; end if;
      predicate := concat_ws(' and ',nullif(predicate,''),format('t.%I = r.%I',col,col));
    end loop;
    if operation = 'insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r',tbl,cols,vals,tbl) using payload;
    elsif operation = 'update' then
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where %s',tbl,assignments,tbl,predicate) using payload;
      get diagnostics affected = row_count;
      -- Zero ligne touchee = soit la ligne n'existe plus, soit le RLS la
      -- masque pour ce role. Le message nomme la table pour qu'on sache
      -- laquelle est en cause sans avoir a fouiller les logs.
      if affected <> 1 then
        raise exception 'Modification refusée sur « % » : ligne absente, supprimée entre-temps, ou interdite par vos permissions. Rechargez la page.', tbl;
      end if;
    elsif operation = 'delete' then
      execute format('delete from public.%I t using jsonb_populate_record(null::public.%I,$1) r where %s',tbl,tbl,predicate) using payload;
      -- Cascading parent deletion may already have removed a child.
      get diagnostics affected = row_count;
      if affected = 0 and tbl <> all(array['product_variant_groups','product_variant_options','product_images','product_collections','promotion_products','site_content']) then
        raise exception 'Suppression refusée sur « % » : ligne déjà supprimée ou interdite par vos permissions.', tbl;
      end if;
    else raise exception 'Opération inconnue';
    end if;
  end loop;
end;
$$;
revoke all on function public.admin_apply_changes(jsonb) from public, anon;
grant execute on function public.admin_apply_changes(jsonb) to authenticated;
commit;

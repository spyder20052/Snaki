-- ===========================================================================
-- SNAKI — DIAGNOSTIC DU CHANGEMENT DE STATUT
-- ===========================================================================
-- A executer dans le SQL Editor de Supabase, puis copier le TABLEAU affiche.
--
-- Tout tient en UNE seule requete, volontairement : l'editeur de Supabase
-- n'affiche que le resultat de la derniere instruction, et n'affiche jamais
-- les messages `NOTICE`. Un diagnostic en plusieurs etapes y est donc
-- invisible. Ici, tout arrive dans un tableau unique.
--
-- Ne modifie rien : le test ecrit puis annule, a l'interieur de la fonction.

-- --- Fonction de test -------------------------------------------------------
-- Elle tente un vrai changement de statut, puis annule systematiquement.
--
-- Deux precautions pour reproduire les conditions du NAVIGATEUR, et non
-- celles du SQL Editor (ou tu es super-utilisateur et ou RLS ne s'applique
-- pas, ce qui ferait passer le test meme avec des declencheurs casses) :
--   - `force row level security` : RLS s'applique meme au proprietaire ;
--   - `set local role authenticated` : le role dont se sert le dashboard.
--
-- Le bloc interne leve toujours une exception : rien n'est conserve, ni le
-- changement de statut, ni les reglages RLS, ni les lignes ecrites par les
-- declencheurs.
create or replace function diagnostiquer_statut(cible uuid)
returns text
language plpgsql
as $$
declare apres text;
begin
  if cible is null then return 'AUCUNE COMMANDE A TESTER'; end if;
  begin
    execute 'alter table order_status_history force row level security';
    if to_regclass('public.push_queue') is not null then
      execute 'alter table push_queue force row level security';
    end if;
    set local role authenticated;

    update orders set status = 'preparing' where id = cible;
    select status into apres from orders where id = cible;

    -- Annule tout, quel que soit le resultat.
    raise exception using errcode = 'SNAKI',
      message = case when apres = 'preparing' then 'OK' else 'FIGE SUR ' || apres end;
  exception
    when sqlstate 'SNAKI' then
      return case when sqlerrm = 'OK'
                  then 'OK — la base accepte le changement'
                  else 'ECHEC — ' || sqlerrm end;
    when others then
      -- Le nom de la table en cause est la partie decisive du message :
      -- il designe directement le declencheur fautif.
      return 'ECHEC [' || sqlstate || '] '
             || coalesce(substring(sqlerrm from 'table "([^"]+)"'), '')
             || case when sqlerrm like '%row-level security%'
                     then ' : ecriture refusee par RLS (declencheur en invoker)'
                     else ' : ' || sqlerrm end;
  end;
end;
$$;

with
-- --- Reglages du test -------------------------------------------------------
cible as (
  select id, reference, status
  from orders
  where status not in ('cancelled','refunded')
  order by created_at desc
  limit 1
),

-- --- 1. Qui je suis pour la base -------------------------------------------
qui as (
  select 1 as ordre, 'QUI SUIS-JE' as controle,
         current_user as valeur,
         'Dans le SQL Editor tu es postgres : RLS ne t applique pas. '
         || 'Le test plus bas simule le vrai role du navigateur.' as lecture
),

-- --- 2. Les declencheurs sur `orders` --------------------------------------
declencheurs as (
  select 2 as ordre, 'DECLENCHEUR ' || t.tgname as controle,
         case when p.prosecdef then 'definer' else 'invoker' end
           || case when t.tgenabled = 'D' then ' / DESACTIVE' else '' end as valeur,
         case when p.prosecdef then 'Correct.'
              else 'BLOQUE TOUT : execute fix-order-status.sql.' end as lecture
  from pg_trigger t join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = 'public.orders'::regclass and not t.tgisinternal
),

-- --- 3. Tables ecrites par les declencheurs --------------------------------
traces as (
  select 3 as ordre, 'TABLE ' || c.relname as controle,
         case when c.relrowsecurity then 'RLS actif' else 'RLS inactif' end
           || ', ' || (select count(*) from pg_policies pol
                       where pol.tablename = c.relname
                         and pol.cmd in ('INSERT','ALL')) || ' politique(s) insert' as valeur,
         'Sans politique insert, seul un declencheur definer peut ecrire.' as lecture
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('order_status_history','push_queue')
),

-- --- 4. Les comptes de l'equipe --------------------------------------------
comptes as (
  select 4 as ordre, 'COMPTE ' || u.email as controle,
         u.role || case when u.active then '' else ' / DESACTIVE' end as valeur,
         'Ce compte doit correspondre a celui connecte au dashboard.' as lecture
  from admin_users u
),

-- --- 5. La commande servant de test ----------------------------------------
commande as (
  select 5 as ordre, 'COMMANDE TESTEE' as controle,
         coalesce((select reference || ' (' || status || ')' from cible),
                  'AUCUNE') as valeur,
         'Le test ci-dessous porte sur cette commande, sans la modifier.' as lecture
),

-- --- 6. Le test reel, dans les conditions du navigateur --------------------
test as (
  select 6 as ordre, 'TEST ECRITURE' as controle,
         coalesce(diagnostiquer_statut((select id from cible)), 'AUCUNE COMMANDE') as valeur,
         'OK = la base accepte. ECHEC = la cause exacte est indiquee.' as lecture
)

select controle, valeur, lecture
from (
  select * from qui
  union all select * from declencheurs
  union all select * from traces
  union all select * from comptes
  union all select * from commande
  union all select * from test
) tout
order by ordre, controle;

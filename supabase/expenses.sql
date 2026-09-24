-- ===========================================================================
-- SNAKI — DEPENSES
-- ===========================================================================
-- A executer dans l'editeur SQL de Supabase, apres schema.sql.
--
-- Enregistre ce que la boutique ACHETE : condiments, gobelets, ingredients,
-- carburant, loyer. C'est ce qui permet de passer du chiffre d'affaires au
-- benefice reel.

create type expense_category as enum (
  'ingredients', 'condiments', 'packaging', 'equipment',
  'delivery', 'rent', 'salary', 'marketing', 'other'
);

create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  category   expense_category not null default 'condiments',
  -- Entier en FCFA, strictement positif : une depense nulle n'a pas de sens,
  -- et une depense negative serait une recette mal rangee.
  amount     integer not null check (amount > 0),
  -- Date de la DEPENSE, pas de la saisie : c'est elle qui rattache le
  -- montant au bon mois quand on enregistre un achat avec du retard.
  spent_at   timestamptz not null default now(),
  supplier   text,
  note       text,
  receipt    text,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Les requetes de la page filtrent toujours sur une periode.
create index if not exists expenses_spent_at_idx on expenses(spent_at desc);
create index if not exists expenses_category_idx on expenses(category);

-- --- RESULTAT PAR MOIS -----------------------------------------------------
-- Vue plutot que colonnes stockees : impossible d'avoir un benefice qui
-- diverge des ventes et des depenses reelles.

create or replace view monthly_profit as
with revenue as (
  select date_trunc('month', created_at)::date as month, sum(total) as revenue
  from orders
  where status not in ('cancelled', 'refunded')
  group by 1
), spending as (
  select date_trunc('month', spent_at)::date as month, sum(amount) as expenses
  from expenses
  group by 1
)
select
  coalesce(r.month, s.month)               as month,
  coalesce(r.revenue, 0)                   as revenue,
  coalesce(s.expenses, 0)                  as expenses,
  coalesce(r.revenue, 0) - coalesce(s.expenses, 0) as profit,
  -- `null` et non zero quand il n'y a aucune vente : afficher « 0 % »
  -- laisserait croire a une perte totale plutot qu'a une absence de donnee.
  case when coalesce(r.revenue, 0) > 0
       then round(((coalesce(r.revenue,0) - coalesce(s.expenses,0))::numeric
                   / r.revenue) * 100, 1)
       else null end                       as margin_percent
from revenue r
full outer join spending s on s.month = r.month
order by 1 desc;

-- --- SECURITE --------------------------------------------------------------
-- Les depenses sont une donnee financiere : jamais visibles du public.

alter table expenses enable row level security;

drop policy if exists "finance reads expenses" on expenses;
create policy "finance reads expenses" on expenses
  for select using (has_permission('finance.view'));

drop policy if exists "finance manages expenses" on expenses;
create policy "finance manages expenses" on expenses
  for all using (has_permission('finance.view'));

-- Journalise les depenses comme le reste du dashboard.
drop trigger if exists dashboard_audit on public.expenses;
create trigger dashboard_audit
  after insert or update or delete on public.expenses
  for each row execute function public.admin_audit_change();

grant select, insert, update, delete on public.expenses to authenticated;

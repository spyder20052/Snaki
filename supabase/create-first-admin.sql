-- 1. Create your user in Supabase Authentication > Users first.
-- 2. Replace the email below with that user's email, then execute this file.
-- Do not include your password here.
do $$
declare
  admin_email text := 'contactsnaki@gmail.com';
  account_id uuid;
begin
  select id into account_id from auth.users where lower(email)=lower(admin_email);
  if account_id is null then
    raise exception 'Compte introuvable : créez-le dans Authentication > Users et renseignez son e-mail.';
  end if;
  insert into public.admin_users(id,name,email,role,active)
  values(account_id,'Administrateur',admin_email,'super_admin',true)
  on conflict(id) do update set role='super_admin', active=true;
end;
$$;

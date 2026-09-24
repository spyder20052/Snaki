\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated, anon;
\ir schema.sql
\ir dashboard-connection.sql
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into admin_users(id,name,email,role) values
('11111111-1111-4111-8111-111111111111','Test admin','admin@example.test','super_admin'),
('22222222-2222-4222-8222-222222222222','Test staff','staff@example.test','orders_staff');
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select admin_apply_changes('[{"table":"categories","op":"insert","row":{"id":"33333333-3333-4333-8333-333333333333","name":"Test","slug":"test","visible":true,"archived":false,"position":6}}]');
select admin_apply_changes('[{"table":"categories","op":"update","row":{"id":"33333333-3333-4333-8333-333333333333","name":"Updated"}}]');
do $$begin
 if not exists(select 1 from categories where name='Updated') then raise exception 'Write did not persist'; end if;
end$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin
 begin
  perform admin_apply_changes('[{"table":"categories","op":"update","row":{"id":"33333333-3333-4333-8333-333333333333","name":"Forbidden"}}]');
  raise exception 'TEST FAILED: unauthorized update accepted';
 exception when raise_exception then
  if sqlerrm like 'TEST FAILED%' then raise; end if;
 end;
end$$;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$begin
 begin
  perform admin_apply_changes('[{"table":"categories","op":"update","row":{"id":"33333333-3333-4333-8333-333333333333","name":"Must rollback"}},{"table":"products","op":"insert","row":{"id":"44444444-4444-4444-8444-444444444444","name":"Invalid","slug":"invalid","price":-1}}]');
  raise exception 'TEST FAILED: invalid transaction accepted';
 exception when check_violation then null;
 end;
 if not exists(select 1 from categories where name='Updated') then raise exception 'Rollback failed'; end if;
end$$;
select 'PASS: insert, update, role denial, transaction rollback' as result;

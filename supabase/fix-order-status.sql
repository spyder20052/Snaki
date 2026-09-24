-- ===========================================================================
-- SNAKI — CORRECTIF : CHANGEMENT DE STATUT DES COMMANDES
-- ===========================================================================
-- A EXECUTER EN ENTIER dans le SQL Editor de Supabase, puis recharger le
-- dashboard. Ce fichier est sans danger a relancer plusieurs fois.
--
-- LE PROBLEME
-- -----------
-- Deux declencheurs s'executent a chaque changement de statut :
--
--   1. `log_order_status`        -> ecrit dans `order_status_history`
--   2. `queue_order_notification` -> ecrit dans `push_queue`
--      (uniquement si push-notifications.sql a ete execute)
--
-- Ces deux tables ont RLS active et AUCUNE politique d'insertion, par
-- choix : personne ne doit pouvoir falsifier un historique ou fabriquer une
-- notification. Mais les declencheurs ecrivaient avec les droits de
-- l'appelant, donc leur insertion etait refusee.
--
-- Et comme un declencheur s'execute DANS la transaction, son echec annule
-- toute la transaction : la commande elle-meme ne changeait pas de statut.
-- D'ou le symptome « seul Confirmer fonctionne » puis « rien ne change ».
--
-- LA CORRECTION
-- -------------
-- Rendre les deux declencheurs `security definer` : ils ecrivent avec les
-- droits du proprietaire de la fonction. C'est volontaire et sans risque —
-- chacun ne fait qu'une chose, tracer ce que RLS a DEJA autorise sur
-- `orders`. Aucun droit supplementaire n'est accorde a qui que ce soit.

-- --- 1. HISTORIQUE DES STATUTS ---------------------------------------------

create or replace function log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into order_status_history (order_id, status, reason, actor_id, actor_name)
    select new.id, new.status, new.cancel_reason, auth.uid(), u.name
    from admin_users u where u.id = auth.uid();

    -- Si l'auteur n'est pas un membre de l'equipe (changement automatique,
    -- ou compte supprime), on garde quand meme la trace : l'historique ne
    -- doit jamais avoir de trou.
    if not found then
      insert into order_status_history (order_id, status, reason)
      values (new.id, new.status, new.cancel_reason);
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Le declencheur ecrit desormais l'historique lui-meme ; personne d'autre
-- n'a besoin d'y inserer directement. Enveloppe dans un bloc pour que
-- l'absence du role (hors Supabase) n'interrompe pas le fichier.
do $$
begin
  revoke insert on order_status_history from authenticated;
exception when undefined_object then
  raise notice 'Role « authenticated » absent : rien a revoquer.';
end;
$$;

-- --- 2. FILE DES NOTIFICATIONS PUSH ----------------------------------------
-- Corrige seulement si la table existe (push-notifications.sql execute).
-- Sinon ce bloc ne fait rien, et le fichier reste executable tel quel.

do $$
begin
  if to_regclass('public.push_queue') is null then
    raise notice 'Table push_queue absente : rien a corriger de ce cote.';
    return;
  end if;

  execute $fn$
    create or replace function queue_order_notification()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, pg_temp
    as $body$
    declare
      first_name text;
      msg_title  text;
      msg_body   text;
    begin
      if new.status is not distinct from old.status then
        return new;
      end if;

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
          return new;
      end case;

      insert into push_queue (order_id, customer_id, phone, title, body, url)
      values (new.id, new.customer_id, new.customer_phone, msg_title, msg_body, '/');

      return new;
    end;
    $body$;
  $fn$;
  raise notice 'Declencheur push corrige.';
end;
$$;

-- ===========================================================================
-- VERIFICATION AUTOMATIQUE
-- ===========================================================================
-- Applique un vrai changement de statut sur une vraie commande, a
-- l'interieur d'un point de sauvegarde qui est TOUJOURS annule. Aucune
-- commande n'est modifiee, meme si le test echoue en cours de route.

do $$
declare
  target   uuid;
  avant    text;
  apres    text;
begin
  select id, status into target, avant
  from orders where status not in ('cancelled','refunded')
  order by created_at desc limit 1;

  if target is null then
    raise notice 'AUCUNE COMMANDE A TESTER — cree une commande puis relance.';
    return;
  end if;

  -- Le bloc imbrique agit comme un point de sauvegarde : quoi qu'il
  -- arrive, on leve une exception a la fin pour tout annuler.
  begin
    update orders set status = 'preparing' where id = target;
    select status into apres from orders where id = target;

    if apres = 'preparing' then
      raise notice 'RESULTAT : OK — le changement de statut fonctionne (% -> preparing).', avant;
    else
      raise notice 'RESULTAT : ECHEC — le statut est reste « % ».', apres;
    end if;

    -- Annule tout ce que le bloc vient de faire, y compris les lignes
    -- ecrites par les declencheurs.
    raise exception using errcode = 'SNAKI';
  exception
    when sqlstate 'SNAKI' then
      raise notice 'Test annule : la commande % est intacte (« % »).', target, avant;
    when others then
      raise notice 'RESULTAT : ECHEC — %', sqlerrm;
  end;
end;
$$;

-- Liste les declencheurs sur `orders` et leur mode de securite.
-- La colonne `securite` doit afficher « definer » sur les deux lignes.
select t.tgname as declencheur,
       case when p.prosecdef then 'definer (correct)' else 'invoker (A CORRIGER)' end as securite
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.orders'::regclass and not t.tgisinternal
order by t.tgname;

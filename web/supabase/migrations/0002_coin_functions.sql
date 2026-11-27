-- DRAMIX — regras de dinheiro no servidor.
-- Todas as escritas de saldo, desbloqueio, assinatura e pagamento passam por aqui.
-- Cada função trava o usuário (pg_advisory_xact_lock) para dois cliques simultâneos não gastarem duas vezes,
-- e a coluna unique (user_id, ref) garante que a mesma operação não se repete.

-- ---------- Base: lançar moedas ----------
create or replace function public.coin_balance(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from public.coin_transactions where user_id = p_user;
$$;

create or replace function public.my_balance() returns int
language sql stable security definer set search_path = public as $$
  select coin_balance(auth.uid());
$$;

-- Interna: não é exposta ao app (revoke no fim do arquivo)
create or replace function public._add_coins(p_user uuid, p_amount int, p_type text, p_description text, p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_balance int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  if p_ref is not null and exists (select 1 from coin_transactions where user_id = p_user and ref = p_ref) then
    return false; -- já lançado
  end if;
  v_balance := coin_balance(p_user);
  if v_balance + p_amount < 0 then
    raise exception 'INSUFFICIENT_COINS: você precisa de % moedas e tem %', -p_amount, v_balance using errcode = 'P0001';
  end if;
  insert into coin_transactions (user_id, amount, type, description, ref, balance_after)
  values (p_user, p_amount, p_type, p_description, p_ref, v_balance + p_amount);
  return true;
end $$;

create or replace function public._require_user() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED: entre na sua conta' using errcode = 'P0001'; end if;
  return auth.uid();
end $$;

-- ---------- Cadastro: perfil + bônus de boas-vindas (uma vez por conta) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_bonus int;
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Espectador'));
  select welcome_bonus_coins into v_bonus from app_settings where id = 'settings';
  if coalesce(v_bonus, 0) > 0 then
    perform _add_coins(new.id, v_bonus, 'welcome_bonus', 'Bônus de boas-vindas', 'welcome_bonus');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Presente diário ----------
create or replace function public.claim_daily_gift(p_tz text default 'America/Sao_Paulo')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := _require_user();
  v_amount int;
  v_day text := to_char(now() at time zone p_tz, 'YYYY-MM-DD');
begin
  select daily_gift_coins into v_amount from app_settings where id = 'settings';
  if coalesce(v_amount, 0) <= 0 or not _add_coins(v_user, v_amount, 'daily_gift', 'Presente diário', 'daily_gift:' || v_day) then
    raise exception 'ALREADY_CLAIMED: você já resgatou o presente de hoje' using errcode = 'P0001';
  end if;
  return json_build_object('amount', v_amount, 'balance', coin_balance(v_user));
end $$;

-- ---------- Acesso ----------
create or replace function public.has_active_subscription(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from subscriptions where user_id = p_user and status = 'active' and end_date > now());
$$;

create or replace function public.has_episode_access(p_episode text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from episodes e join series s on s.id = e.series_id
    where e.id = p_episode and s.is_published and (
      e.episode_number <= s.free_episodes_count
      or (auth.uid() is not null and (
        has_active_subscription(auth.uid())
        or exists (select 1 from episode_unlocks u where u.user_id = auth.uid() and u.episode_id = e.id)
      ))
    )
  );
$$;

create or replace function public._episode_price(p_series text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(s.price_coins, a.episode_price_coins) from series s, app_settings a where s.id = p_series and a.id = 'settings';
$$;

-- ---------- Desbloquear 1 episódio com moedas ----------
create or replace function public.unlock_episode(p_series text, p_episode_number int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := _require_user();
  v_ep episodes%rowtype;
  v_title text;
  v_price int;
begin
  select e.* into v_ep from episodes e join series s on s.id = e.series_id
   where e.series_id = p_series and e.episode_number = p_episode_number and s.is_published;
  if not found then raise exception 'NOT_FOUND: episódio não encontrado' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  if has_episode_access(v_ep.id) then
    return json_build_object('alreadyUnlocked', true, 'spent', 0, 'balance', coin_balance(v_user));
  end if;
  select title into v_title from series where id = p_series;
  v_price := _episode_price(p_series);
  perform _add_coins(v_user, -v_price, 'episode_unlock', v_title || ' — episódio ' || p_episode_number, 'unlock:' || v_ep.id);
  insert into episode_unlocks (user_id, series_id, episode_id, unlock_type) values (v_user, p_series, v_ep.id, 'coins')
    on conflict (user_id, episode_id) do nothing;
  return json_build_object('alreadyUnlocked', false, 'spent', v_price, 'balance', coin_balance(v_user));
end $$;

-- ---------- Desbloquear o restante da série com desconto ----------
create or replace function public.unlock_series(p_series text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := _require_user();
  v_ids text[];
  v_count int;
  v_price int;
  v_discount int;
  v_title text;
begin
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select array_agg(e.id order by e.episode_number) into v_ids
    from episodes e where e.series_id = p_series and not has_episode_access(e.id);
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then return json_build_object('unlocked', 0, 'spent', 0, 'balance', coin_balance(v_user)); end if;
  select series_bundle_discount_percent into v_discount from app_settings where id = 'settings';
  v_price := ceil(v_count * _episode_price(p_series) * (100 - v_discount) / 100.0);
  select title into v_title from series where id = p_series;
  perform _add_coins(v_user, -v_price, 'series_unlock', v_title || ' — ' || v_count || ' episódios', 'bundle:' || p_series || ':' || array_to_string(v_ids, ','));
  insert into episode_unlocks (user_id, series_id, episode_id, unlock_type)
    select v_user, p_series, unnest(v_ids), 'coins_bundle' on conflict (user_id, episode_id) do nothing;
  return json_build_object('unlocked', v_count, 'spent', v_price, 'balance', coin_balance(v_user));
end $$;

-- ---------- Anúncio recompensado (chamado pela Edge Function que recebe a verificação SSV da rede) ----------
create or replace function public.grant_ad_unlock(p_user uuid, p_episode text, p_ad_tx text)
returns void language plpgsql security definer set search_path = public as $$
declare v_cooldown int; v_series text;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select rewarded_ad_cooldown_hours into v_cooldown from app_settings where id = 'settings';
  if exists (select 1 from rewarded_ad_unlocks where user_id = p_user and created_at > now() - make_interval(hours => v_cooldown)) then
    raise exception 'AD_COOLDOWN: desbloqueio com anúncio já usado' using errcode = 'P0001';
  end if;
  select series_id into v_series from episodes where id = p_episode;
  insert into rewarded_ad_unlocks (user_id, episode_id, ad_network_tx) values (p_user, p_episode, p_ad_tx);
  insert into episode_unlocks (user_id, series_id, episode_id, unlock_type) values (p_user, v_series, p_episode, 'rewarded_ad')
    on conflict (user_id, episode_id) do nothing;
end $$;

-- ---------- Teste grátis (uma vez por conta) ----------
create or replace function public.start_trial() returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := _require_user();
begin
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  if exists (select 1 from subscriptions where user_id = v_user and (is_trial or (status = 'active' and end_date > now())))
     or exists (select 1 from payments where user_id = v_user and kind = 'subscription' and status = 'paid') then
    raise exception 'TRIAL_USED: teste grátis indisponível para esta conta' using errcode = 'P0001';
  end if;
  insert into subscriptions (user_id, plan_id, status, is_trial, start_date, end_date, auto_renew)
  values (v_user, 'plan-trial', 'active', true, now(), now() + interval '3 days', false)
  on conflict (user_id) do update set plan_id = 'plan-trial', status = 'active', is_trial = true,
    start_date = now(), end_date = now() + interval '3 days', auto_renew = false;
end $$;

create or replace function public.cancel_renewal() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_end timestamptz;
begin
  update subscriptions set auto_renew = false where user_id = _require_user() and status = 'active' and end_date > now()
    returning end_date into v_end;
  if v_end is null then raise exception 'NOT_FOUND: nenhuma assinatura ativa' using errcode = 'P0001'; end if;
  return v_end;
end $$;

-- ---------- Pedido de compra (o app cria; o gateway confirma) ----------
create or replace function public.create_order(p_kind text, p_item text, p_method text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := _require_user();
  v_id text := 'tx_' || replace(gen_random_uuid()::text, '-', '');
  v_amount numeric; v_coins int;
begin
  if p_kind = 'coins' then
    select price, coins + bonus_coins into v_amount, v_coins from coin_packages where id = p_item and is_active;
  else
    select price into v_amount from subscription_plans where id = p_item and is_active and id <> 'plan-trial';
  end if;
  if v_amount is null then raise exception 'NOT_FOUND: item indisponível' using errcode = 'P0001'; end if;
  insert into payments (id, kind, user_id, plan_id, package_id, coins_total, amount, method)
  values (v_id, p_kind, v_user, case when p_kind = 'subscription' then p_item end, case when p_kind = 'coins' then p_item end, v_coins, v_amount, p_method);
  return json_build_object('transactionId', v_id, 'amount', v_amount);
end $$;

-- Só o webhook do gateway (service_role) confirma. Confirmar de novo não credita de novo.
create or replace function public.confirm_payment(p_tx text, p_gateway_id text)
returns json language plpgsql security definer set search_path = public as $$
declare v_p payments%rowtype; v_days int;
begin
  select * into v_p from payments where id = p_tx for update;
  if not found then raise exception 'NOT_FOUND: pagamento não encontrado' using errcode = 'P0001'; end if;
  if v_p.status = 'paid' then return json_build_object('alreadyConfirmed', true); end if;
  update payments set status = 'paid', paid_at = now(), gateway_id = p_gateway_id where id = p_tx;
  if v_p.kind = 'coins' then
    perform _add_coins(v_p.user_id, v_p.coins_total, 'purchase', 'Compra de ' || v_p.coins_total || ' moedas', 'payment:' || p_tx);
  else
    select duration_days into v_days from subscription_plans where id = v_p.plan_id;
    insert into subscriptions (user_id, plan_id, status, is_trial, start_date, end_date, auto_renew, transaction_id)
    values (v_p.user_id, v_p.plan_id, 'active', false, now(), now() + make_interval(days => v_days), true, p_tx)
    on conflict (user_id) do update set plan_id = excluded.plan_id, status = 'active', is_trial = false,
      start_date = excluded.start_date, end_date = excluded.end_date, auto_renew = true, transaction_id = p_tx;
  end if;
  return json_build_object('alreadyConfirmed', false, 'kind', v_p.kind);
end $$;

-- Restaurar compras: credita o que falta, nunca duplica
create or replace function public.restore_purchases() returns json
language plpgsql security definer set search_path = public as $$
declare v_user uuid := _require_user(); v_restored int := 0; r record;
begin
  for r in select * from payments where user_id = v_user and status = 'paid' and kind = 'coins' loop
    if _add_coins(v_user, r.coins_total, 'purchase', 'Compra de ' || r.coins_total || ' moedas (restaurada)', 'payment:' || r.id) then
      v_restored := v_restored + r.coins_total;
    end if;
  end loop;
  return json_build_object('coinsRestored', v_restored);
end $$;

-- ---------- Quem pode chamar o quê ----------
revoke all on function public._add_coins(uuid, int, text, text, text) from public, anon, authenticated;
revoke all on function public.coin_balance(uuid) from public, anon, authenticated;
revoke all on function public.has_active_subscription(uuid) from public, anon, authenticated;
revoke all on function public._episode_price(text) from public, anon, authenticated;
revoke all on function public._require_user() from public, anon;
revoke all on function public.grant_ad_unlock(uuid, text, text) from public, anon, authenticated;
revoke all on function public.confirm_payment(text, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.claim_daily_gift(text), public.unlock_episode(text, int), public.unlock_series(text),
  public.start_trial(), public.cancel_renewal(), public.create_order(text, text, text), public.restore_purchases()
  to authenticated;
grant execute on function public.has_episode_access(text) to anon, authenticated;
grant execute on function public.my_balance() to authenticated;
grant execute on function public.grant_ad_unlock(uuid, text, text), public.confirm_payment(text, text) to service_role;

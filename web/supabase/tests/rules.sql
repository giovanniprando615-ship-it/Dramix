-- Testes das regras de moedas e das permissões. Qualquer falha interrompe com erro.
\set QUIET on
create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin if not cond then raise exception 'FALHOU: %', msg; end if; raise notice 'ok - %', msg; end $$;
create or replace function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
$$;

-- Catálogo de teste
insert into series (id, title, poster_url) values ('ser-t', 'Série Teste', 'https://x/p.jpg');
insert into episodes (series_id, episode_number, title, video_path, duration_seconds)
  select 'ser-t', n, 'Ep ' || n, 'videos/' || n || '.mp4', 120 from generate_series(1, 10) n;
insert into series (id, title, poster_url, is_published) values ('ser-oculta', 'Rascunho', 'https://x/p.jpg', false);

-- Cadastro: bônus de 50 automático
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'ana@t.com'), ('00000000-0000-0000-0000-00000000000b', 'bia@t.com');
select pg_temp.check(coin_balance('00000000-0000-0000-0000-00000000000a') = 50, 'cadastro dá 50 moedas');

set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((claim_daily_gift() ->> 'balance')::int = 70, 'presente diário soma 20 (total 70)');
do $$ begin perform claim_daily_gift(); raise exception 'deveria falhar'; exception when others then
  perform pg_temp.check(sqlerrm like 'ALREADY_CLAIMED%', 'presente não repete no mesmo dia'); end $$;
select pg_temp.check(my_balance() = 70, 'my_balance mostra o próprio saldo');

-- Acesso e desbloqueio
select pg_temp.check(has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 5)), 'episódio 5 é grátis');
select pg_temp.check(not has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 6)), 'episódio 6 é bloqueado');
select pg_temp.check((unlock_episode('ser-t', 6) ->> 'balance')::int = 45, 'desbloqueio cobra 25');
select pg_temp.check((unlock_episode('ser-t', 6) ->> 'alreadyUnlocked')::boolean, 'segundo desbloqueio não cobra');
select pg_temp.check(my_balance() = 45, 'saldo continua 45');
do $$ begin perform unlock_series('ser-t'); raise exception 'deveria falhar'; exception when others then
  perform pg_temp.check(sqlerrm like 'INSUFFICIENT_COINS%', 'pacote da série sem saldo é recusado (4 eps = 80 moedas)'); end $$;

-- O usuário não consegue gravar dinheiro direto
do $$ begin
  insert into coin_transactions (user_id, amount, type, description, balance_after) values (auth.uid(), 9999, 'purchase', 'hack', 9999);
  raise exception 'deveria falhar';
exception when others then perform pg_temp.check(sqlerrm not like 'deveria%', 'app não insere moedas direto (RLS)'); end $$;
do $$ begin perform _add_coins(auth.uid(), 9999, 'purchase', 'hack', null); raise exception 'deveria falhar';
exception when insufficient_privilege then perform pg_temp.check(true, 'app não chama _add_coins'); end $$;
do $$ begin perform confirm_payment('x', 'y'); raise exception 'deveria falhar';
exception when insufficient_privilege then perform pg_temp.check(true, 'app não confirma pagamento sozinho'); end $$;
do $$ begin perform coin_balance('00000000-0000-0000-0000-00000000000b'); raise exception 'deveria falhar';
exception when insufficient_privilege then perform pg_temp.check(true, 'não consulta saldo de outra conta'); end $$;
do $$ begin perform has_active_subscription('00000000-0000-0000-0000-00000000000b'); raise exception 'deveria falhar';
exception when insufficient_privilege then perform pg_temp.check(true, 'não descobre se outra conta assina o Premium'); end $$;
update profiles set name = 'Ana' where id = auth.uid();
do $$ begin update profiles set role = 'owner' where id = auth.uid(); raise exception 'deveria falhar';
exception when insufficient_privilege then perform pg_temp.check(true, 'usuário não se promove a owner'); end $$;
select pg_temp.check((select count(*) from coin_transactions where user_id <> auth.uid()) = 0, 'não vê extrato de outra conta');
select pg_temp.check((select count(*) from series where id = 'ser-oculta') = 0, 'série não publicada fica escondida');

-- Compra: o webhook confirma uma vez só
select create_order('coins', 'pkg-600', 'pix') ->> 'transactionId' as tx \gset
reset role;
set role service_role;
select confirm_payment(:'tx', 'gw-1');
select confirm_payment(:'tx', 'gw-1');
reset role;
select pg_temp.check(coin_balance('00000000-0000-0000-0000-00000000000a') = 765, 'compra de 720 creditada uma vez (45 + 720)');
set role authenticated;
select pg_temp.check((restore_purchases() ->> 'coinsRestored')::int = 0, 'restaurar não duplica');
select pg_temp.check((unlock_series('ser-t') ->> 'spent')::int = 80, 'pacote dos 4 restantes custa 80 (-20%)');
select pg_temp.check(has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 10)), 'episódio 10 liberado');

-- Outra conta: saldo e desbloqueios separados
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(my_balance() = 50, 'outra conta tem os próprios 50');
select pg_temp.check(not has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 6)), 'desbloqueio da Ana não vale para a Bia');
select start_trial();
select pg_temp.check(has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 9)), 'teste grátis libera tudo');
do $$ begin perform start_trial(); raise exception 'deveria falhar'; exception when others then
  perform pg_temp.check(sqlerrm like 'TRIAL_USED%', 'teste grátis só uma vez'); end $$;

-- Visitante
select pg_temp.login(null);
reset role;
set role anon;
select pg_temp.check(has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 1)), 'visitante vê episódio 1');
select pg_temp.check(not has_episode_access((select id from episodes where series_id = 'ser-t' and episode_number = 6)), 'visitante não vê episódio 6');
select pg_temp.check((select count(*) from coin_transactions) = 0, 'visitante não vê extrato nenhum');
reset role;

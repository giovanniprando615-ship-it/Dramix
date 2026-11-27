-- DRAMIX — esquema do banco (Supabase / Postgres 15+)
-- Mesmos nomes de tabela e coluna do app (web/src/domain/types.ts).
-- Regra de ouro: o navegador LÊ o que é dele, mas NUNCA grava saldo, desbloqueio, pagamento ou assinatura.
-- Essas escritas só acontecem pelas funções de 0002_coin_functions.sql.

create extension if not exists pgcrypto;

-- ---------- Perfis (1:1 com auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Espectador',
  avatar text,
  role text not null default 'user' check (role in ('user', 'owner')),
  age_range text check (age_range in ('13-17', '18-24', '25-34', '35-44', '45+')),
  preferred_genres text[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Catálogo ----------
create table public.series (
  id text primary key default 'ser-' || substr(gen_random_uuid()::text, 1, 8),
  title text not null,
  synopsis text not null default '',
  poster_url text not null,
  backdrop_url text not null default '',
  trailer_url text not null default '',
  genres text[] not null default '{}',
  tropes text[] not null default '{}',
  badge text,
  content_rating text not null default '14+' check (content_rating in ('Livre', '12+', '14+', '16+', '18+')),
  free_episodes_count int not null default 5 check (free_episodes_count >= 0),
  price_coins int check (price_coins > 0),
  is_featured boolean not null default false,
  is_published boolean not null default true,
  views_count bigint not null default 0,
  weekly_rank int,
  episodes_count int not null default 0,
  total_minutes int not null default 0,
  created_at timestamptz not null default now()
);

create table public.episodes (
  id text primary key default 'ep-' || substr(gen_random_uuid()::text, 1, 12),
  series_id text not null references public.series (id) on delete cascade,
  episode_number int not null check (episode_number > 0),
  title text not null,
  -- Caminho do arquivo no storage. A URL tocável é assinada pela Edge Function só depois de checar o acesso.
  video_path text not null,
  duration_seconds int not null check (duration_seconds > 0),
  created_at timestamptz not null default now(),
  unique (series_id, episode_number)
);

create table public.genres (id text primary key, name text not null unique, slug text not null unique);

create table public.home_sections (
  id text primary key,
  title text not null,
  row_type text not null check (row_type in ('hero', 'continue_watching', 'top10', 'recommended', 'row')),
  filter_key text,
  sort_order int not null,
  is_enabled boolean not null default true
);

-- ---------- Regras e loja ----------
create table public.app_settings (
  id text primary key default 'settings' check (id = 'settings'),
  welcome_bonus_coins int not null default 50 check (welcome_bonus_coins >= 0),
  daily_gift_coins int not null default 20 check (daily_gift_coins >= 0),
  episode_price_coins int not null default 25 check (episode_price_coins > 0),
  series_bundle_discount_percent int not null default 20 check (series_bundle_discount_percent between 0 and 90),
  default_free_episodes int not null default 5 check (default_free_episodes >= 0),
  rewarded_ad_cooldown_hours int not null default 24 check (rewarded_ad_cooldown_hours >= 0),
  support_email text not null default 'suporte@dramix.tv'
);

create table public.subscription_plans (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  duration_days int not null check (duration_days > 0),
  description text not null default '',
  badge text,
  is_active boolean not null default true
);

create table public.coin_packages (
  id text primary key,
  coins int not null check (coins > 0),
  bonus_coins int not null default 0 check (bonus_coins >= 0),
  price numeric(10, 2) not null check (price > 0),
  badge text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ---------- Dados de cada usuário ----------
create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null check (amount <> 0),
  type text not null check (type in ('welcome_bonus', 'daily_gift', 'purchase', 'episode_unlock', 'series_unlock', 'refund', 'adjustment')),
  description text not null,
  ref text,
  balance_after int not null check (balance_after >= 0),
  created_at timestamptz not null default now(),
  -- A mesma operação nunca é lançada duas vezes: bônus, presente do dia, desbloqueio, pagamento
  unique (user_id, ref)
);
create index on public.coin_transactions (user_id, created_at desc);

create table public.episode_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id text not null references public.series (id) on delete cascade,
  episode_id text not null references public.episodes (id) on delete cascade,
  unlock_type text not null check (unlock_type in ('coins', 'coins_bundle', 'rewarded_ad')),
  created_at timestamptz not null default now(),
  unique (user_id, episode_id)
);

create table public.rewarded_ad_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id text not null references public.episodes (id) on delete cascade,
  ad_network_tx text unique, -- id da verificação server-side (SSV) da rede de anúncios
  created_at timestamptz not null default now()
);
create index on public.rewarded_ad_unlocks (user_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id text not null references public.subscription_plans (id),
  status text not null check (status in ('active', 'canceled')),
  is_trial boolean not null default false,
  start_date timestamptz not null,
  end_date timestamptz not null,
  auto_renew boolean not null default true,
  transaction_id text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id text primary key,
  kind text not null check (kind in ('subscription', 'coins')),
  user_id uuid references auth.users (id) on delete set null, -- mantém o registro fiscal se a conta for excluída
  plan_id text references public.subscription_plans (id),
  package_id text references public.coin_packages (id),
  coins_total int,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  method text not null check (method in ('pix', 'credit_card')),
  gateway_id text unique, -- id do pagamento no Mercado Pago / Pagar.me / Stripe
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check ((kind = 'coins' and package_id is not null and coins_total > 0) or (kind = 'subscription' and plan_id is not null))
);

create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id text not null references public.series (id) on delete cascade,
  episode_id text not null references public.episodes (id) on delete cascade,
  progress_seconds int not null default 0 check (progress_seconds >= 0),
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, series_id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id text not null references public.series (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, series_id)
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null default '',
  email text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  subject text not null,
  message text not null check (length(trim(message)) >= 10),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------- Permissões (RLS) ----------
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

alter table public.profiles enable row level security;
alter table public.series enable row level security;
alter table public.episodes enable row level security;
alter table public.genres enable row level security;
alter table public.home_sections enable row level security;
alter table public.app_settings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.coin_packages enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.episode_unlocks enable row level security;
alter table public.rewarded_ad_unlocks enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.watch_history enable row level security;
alter table public.favorites enable row level security;
alter table public.support_tickets enable row level security;

-- Catálogo e regras: todos leem o que está publicado; só o Owner escreve
create policy "catálogo público" on public.series for select using (is_published or public.is_owner());
create policy "owner edita séries" on public.series for all using (public.is_owner()) with check (public.is_owner());
create policy "episódios de séries publicadas" on public.episodes for select
  using (exists (select 1 from public.series s where s.id = series_id and (s.is_published or public.is_owner())));
create policy "owner edita episódios" on public.episodes for all using (public.is_owner()) with check (public.is_owner());
create policy "gêneros públicos" on public.genres for select using (true);
create policy "owner edita gêneros" on public.genres for all using (public.is_owner()) with check (public.is_owner());
create policy "home pública" on public.home_sections for select using (true);
create policy "owner edita home" on public.home_sections for all using (public.is_owner()) with check (public.is_owner());
create policy "regras públicas" on public.app_settings for select using (true);
create policy "owner edita regras" on public.app_settings for update using (public.is_owner()) with check (public.is_owner());
create policy "planos públicos" on public.subscription_plans for select using (is_active or public.is_owner());
create policy "owner edita planos" on public.subscription_plans for all using (public.is_owner()) with check (public.is_owner());
create policy "pacotes públicos" on public.coin_packages for select using (is_active or public.is_owner());
create policy "owner edita pacotes" on public.coin_packages for all using (public.is_owner()) with check (public.is_owner());

-- Dados pessoais: cada um vê só o seu (o Owner vê tudo para suporte e métricas)
create policy "perfil próprio" on public.profiles for select using (id = auth.uid() or public.is_owner());
create policy "edita o próprio perfil" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "extrato próprio" on public.coin_transactions for select using (user_id = auth.uid() or public.is_owner());
create policy "desbloqueios próprios" on public.episode_unlocks for select using (user_id = auth.uid() or public.is_owner());
create policy "anúncios próprios" on public.rewarded_ad_unlocks for select using (user_id = auth.uid() or public.is_owner());
create policy "assinatura própria" on public.subscriptions for select using (user_id = auth.uid() or public.is_owner());
create policy "pagamentos próprios" on public.payments for select using (user_id = auth.uid() or public.is_owner());
create policy "histórico próprio" on public.watch_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "lista própria" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "abre chamado" on public.support_tickets for insert with check (user_id is null or user_id = auth.uid());
create policy "owner vê chamados" on public.support_tickets for select using (public.is_owner());
create policy "owner fecha chamados" on public.support_tickets for update using (public.is_owner()) with check (public.is_owner());

-- O usuário só altera estas colunas do próprio perfil (role fica de fora: ninguém se promove a Owner)
revoke update on public.profiles from anon, authenticated;
grant update (name, avatar, age_range, preferred_genres, onboarded) on public.profiles to authenticated;

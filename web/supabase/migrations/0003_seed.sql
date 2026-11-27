-- DRAMIX — dados iniciais (regras, planos, pacotes, gêneros, Home). Séries e episódios entram pelo Painel Owner.
insert into public.app_settings (id) values ('settings') on conflict do nothing;

insert into public.subscription_plans (id, name, price, duration_days, description, badge) values
  ('plan-trial', 'Teste grátis', 0, 3, '3 dias com tudo liberado.', null),
  ('plan-weekly', 'Semanal', 7.90, 7, 'Para maratonar uma história no fim de semana.', null),
  ('plan-monthly', 'Mensal', 29.90, 30, 'Todo o catálogo liberado, cancele quando quiser.', 'Mais escolhido'),
  ('plan-annual', 'Anual', 199.90, 365, '12 meses pelo menor preço por mês.', 'Melhor custo-benefício')
on conflict (id) do nothing;

insert into public.coin_packages (id, coins, bonus_coins, price, badge, sort_order) values
  ('pkg-150', 150, 0, 4.90, null, 1),
  ('pkg-300', 300, 30, 9.90, null, 2),
  ('pkg-600', 600, 120, 19.90, 'Mais escolhido', 3),
  ('pkg-1200', 1200, 360, 39.90, null, 4),
  ('pkg-2400', 2400, 960, 79.90, 'Melhor valor', 5)
on conflict (id) do nothing;

insert into public.genres (id, name, slug) values
  ('gen-romance', 'Romance', 'romance'), ('gen-drama', 'Drama', 'drama'), ('gen-vinganca', 'Vingança', 'vinganca'),
  ('gen-ceo', 'CEO', 'ceo'), ('gen-acao', 'Ação', 'acao'), ('gen-suspense', 'Suspense', 'suspense'),
  ('gen-fantasia', 'Fantasia', 'fantasia'), ('gen-comedia', 'Comédia', 'comedia'), ('gen-misterio', 'Mistério', 'misterio')
on conflict (id) do nothing;

insert into public.home_sections (id, title, row_type, filter_key, sort_order) values
  ('sec-hero', 'Em destaque', 'hero', null, 1),
  ('sec-continue', 'Continue assistindo', 'continue_watching', null, 2),
  ('sec-top10', 'Top 10 da semana no Brasil', 'top10', null, 3),
  ('sec-recommended', 'Recomendado para você', 'recommended', null, 4),
  ('sec-new', 'Lançamentos', 'row', 'new', 5),
  ('sec-romance', 'Romances', 'row', 'genre:Romance', 6),
  ('sec-revenge', 'Drama e vingança', 'row', 'genre:Drama,Vingança', 7),
  ('sec-action', 'Ação e suspense', 'row', 'genre:Ação,Suspense', 8),
  ('sec-fantasy', 'Fantasia', 'row', 'genre:Fantasia', 9)
on conflict (id) do nothing;

-- Para tornar uma conta Owner (rode no SQL Editor do Supabase, com o e-mail real):
-- update public.profiles set role = 'owner' where id = (select id from auth.users where email = 'voce@empresa.com');

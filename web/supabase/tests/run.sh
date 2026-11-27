#!/usr/bin/env bash
# Testa as migrations num Postgres local que imita o Supabase (schema auth, papéis anon/authenticated/service_role).
# Uso: PGURL=postgres://postgres@localhost/postgres bash supabase/tests/run.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
PGURL="${PGURL:-postgres://postgres@localhost/postgres}"
DB="dramix_test_$$"

psql "$PGURL" -qc "create database $DB" >/dev/null
trap 'psql "$PGURL" -qc "drop database if exists $DB" >/dev/null' EXIT
URL="${PGURL%/*}/$DB"
run() { psql "$URL" -v ON_ERROR_STOP=1 -q "$@"; }

run <<'SQL'
-- Imitação mínima do Supabase
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Como no Supabase: toda tabela nova já nasce com privilégios para os papéis da API (a RLS é quem filtra)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL

for f in "$DIR"/migrations/*.sql; do run -f "$f"; done

run -qtAX -o /dev/null -f "$DIR/tests/rules.sql"
echo "SQL OK"

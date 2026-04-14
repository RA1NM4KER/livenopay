create extension if not exists pgcrypto;

create table if not exists public.energy_rows (
  id bigint generated always as identity primary key,
  capture_dt text not null,
  charge_label text not null,
  period_dt text not null,
  kwh numeric(12, 4) not null default 0,
  tariff numeric(12, 4) not null default 0,
  cost numeric(12, 2) not null default 0,
  balance numeric(12, 2) not null default 0,
  charge_kind text generated always as (
    case
      when charge_label like 'Energy Charge:%' then 'energy'
      when charge_label = 'Top Up' then 'topup'
      else 'fixed'
    end
  ) stored,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  sync_run_id uuid
);

create unique index if not exists energy_rows_ledger_key
  on public.energy_rows (charge_label, period_dt, cost, balance);

create index if not exists energy_rows_period_dt_idx
  on public.energy_rows (period_dt);

create table if not exists public.capture_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'incremental',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  rows_in_csv integer,
  rows_synced integer,
  error text
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'energy_rows_sync_run_id_fkey'
  ) then
    alter table public.energy_rows
      add constraint energy_rows_sync_run_id_fkey
      foreign key (sync_run_id)
      references public.capture_runs (id)
      on delete set null;
  end if;
end $$;

alter table public.energy_rows enable row level security;
alter table public.capture_runs enable row level security;

drop policy if exists "energy rows are readable" on public.energy_rows;
create policy "energy rows are readable"
  on public.energy_rows
  for select
  to anon
  using (true);

drop policy if exists "capture runs are readable" on public.capture_runs;
create policy "capture runs are readable"
  on public.capture_runs
  for select
  to anon
  using (true);

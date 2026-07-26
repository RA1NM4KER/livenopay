-- Nullable, additive ownership columns. Nothing reads these yet, so this is
-- safe to apply on its own. NOT NULL is enforced later, after the legacy
-- owner backfill (scripts/backfill-legacy-owner.ts) has run.

alter table public.energy_rows
  add column connection_id uuid references public.livemopay_connections(id) on delete cascade;

alter table public.capture_runs
  add column connection_id uuid references public.livemopay_connections(id) on delete cascade;

alter table public.energy_day_rollups
  add column connection_id uuid references public.livemopay_connections(id) on delete cascade;

alter table public.energy_hourly_rollups
  add column connection_id uuid references public.livemopay_connections(id) on delete cascade;

alter table public.energy_interval_rollups
  add column connection_id uuid references public.livemopay_connections(id) on delete cascade;

alter table public.dashboard_summary
  add column connection_id uuid references public.livemopay_connections(id) on delete cascade;

create index energy_rows_connection_period_dt_idx
  on public.energy_rows (connection_id, period_dt);

create index capture_runs_connection_status_idx
  on public.capture_runs (connection_id, status);

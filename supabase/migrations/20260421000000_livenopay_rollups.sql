create extension if not exists pgcrypto;

create table if not exists public.energy_day_rollups (
  period_date date primary key,
  energy_spend numeric(12, 2) not null default 0,
  fixed_spend numeric(12, 2) not null default 0,
  topup_amount numeric(12, 2) not null default 0,
  total_spend numeric(12, 2) not null default 0,
  energy_kwh numeric(12, 4) not null default 0,
  weighted_tariff numeric(12, 4) not null default 0,
  peak_tariff numeric(12, 4) not null default 0,
  all_in_rate numeric(12, 4) not null default 0,
  balance_end numeric(12, 2) not null default 0,
  latest_period text,
  energy_intervals integer not null default 0,
  is_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  sync_run_id uuid
);

create table if not exists public.energy_hourly_rollups (
  period_date date not null,
  hour smallint not null,
  spend numeric(12, 2) not null default 0,
  kwh numeric(12, 4) not null default 0,
  intervals integer not null default 0,
  updated_at timestamptz not null default now(),
  sync_run_id uuid,
  primary key (period_date, hour)
);

create table if not exists public.energy_interval_rollups (
  period_date date not null,
  period_time time without time zone not null,
  spend numeric(12, 2) not null default 0,
  kwh numeric(12, 4) not null default 0,
  updated_at timestamptz not null default now(),
  sync_run_id uuid,
  primary key (period_date, period_time)
);

create table if not exists public.dashboard_summary (
  id integer primary key default 1,
  date_start date,
  date_end date,
  latest_balance numeric(12, 2),
  latest_period text,
  last_synced_at timestamptz,
  rows_in_csv integer,
  rows_synced integer,
  max_interval_spend numeric(12, 2),
  max_interval_kwh numeric(12, 4),
  updated_at timestamptz not null default now(),
  sync_run_id uuid
);

insert into public.dashboard_summary (id)
values (1)
on conflict (id) do nothing;

create or replace function public.parse_livenopay_period_ts(value text)
returns timestamp without time zone
language sql
immutable
as $$
  select coalesce(
    to_timestamp(value, 'YYYY-MM-DD HH24:MI:SS')::timestamp,
    to_timestamp(value, 'YYYY-MM-DD HH24:MI')::timestamp,
    to_timestamp(value, 'YYYY-MM-DD"T"HH24:MI:SS')::timestamp,
    to_timestamp(value, 'YYYY-MM-DD"T"HH24:MI')::timestamp
  )
$$;

create or replace function public.parse_livenopay_capture_ts(value text)
returns timestamp without time zone
language sql
immutable
as $$
  select coalesce(
    to_timestamp(value, 'DD/MM/YYYY HH24:MI:SS')::timestamp,
    to_timestamp(value, 'DD/MM/YYYY HH24:MI')::timestamp
  )
$$;

create or replace function public.refresh_livenopay_rollups(p_run_id uuid)
returns void
language plpgsql
as $$
declare
  run_record public.capture_runs%rowtype;
begin
  select *
  into run_record
  from public.capture_runs
  where id = p_run_id;

  if not found then
    return;
  end if;

  delete from public.energy_day_rollups
  where period_date in (
    select distinct public.parse_livenopay_period_ts(period_dt)::date
    from public.energy_rows
    where sync_run_id = p_run_id
  );

  delete from public.energy_hourly_rollups
  where period_date in (
    select distinct public.parse_livenopay_period_ts(period_dt)::date
    from public.energy_rows
    where sync_run_id = p_run_id
  );

  delete from public.energy_interval_rollups
  where period_date in (
    select distinct public.parse_livenopay_period_ts(period_dt)::date
    from public.energy_rows
    where sync_run_id = p_run_id
  );

  with affected_dates as (
    select distinct public.parse_livenopay_period_ts(period_dt)::date as period_date
    from public.energy_rows
    where sync_run_id = p_run_id
  ),
  daily_latest as (
    select distinct on (period_date)
      period_date,
      period_dt as latest_period,
      balance as balance_end
    from (
      select
        public.parse_livenopay_period_ts(period_dt)::date as period_date,
        period_dt,
        balance,
        public.parse_livenopay_period_ts(period_dt) as period_ts,
        public.parse_livenopay_capture_ts(capture_dt) as capture_ts,
        id
      from public.energy_rows
      where public.parse_livenopay_period_ts(period_dt)::date in (select period_date from affected_dates)
    ) ordered_rows
    order by period_date, period_ts desc, capture_ts desc, id desc
  ),
  daily_aggregates as (
    select
      public.parse_livenopay_period_ts(period_dt)::date as period_date,
      round(sum(case when charge_kind = 'energy' then cost else 0 end)::numeric, 2) as energy_spend,
      round(sum(case when charge_kind = 'fixed' then cost else 0 end)::numeric, 2) as fixed_spend,
      round(sum(case when charge_kind = 'topup' then cost else 0 end)::numeric, 2) as topup_amount,
      round(sum(case when charge_kind in ('energy', 'fixed') then cost else 0 end)::numeric, 2) as total_spend,
      round(sum(case when charge_kind = 'energy' then kwh else 0 end)::numeric, 4) as energy_kwh,
      round(
        sum(case when charge_kind = 'energy' then (kwh * tariff) else 0 end)::numeric
        / nullif(sum(case when charge_kind = 'energy' then kwh else 0 end), 0),
        4
      ) as weighted_tariff,
      round(max(case when charge_kind = 'energy' then tariff else 0 end)::numeric, 4) as peak_tariff,
      round(
        sum(case when charge_kind in ('energy', 'fixed') then cost else 0 end)::numeric
        / nullif(sum(case when charge_kind = 'energy' then kwh else 0 end), 0),
        4
      ) as all_in_rate,
      count(distinct case when charge_kind = 'energy' then substring(period_dt from 12 for 5) end)::integer as energy_intervals,
      count(distinct case when charge_kind = 'energy' then substring(period_dt from 12 for 5) end) >= 48 as is_complete
    from public.energy_rows
    where public.parse_livenopay_period_ts(period_dt)::date in (select period_date from affected_dates)
    group by 1
  )
  insert into public.energy_day_rollups (
    period_date,
    energy_spend,
    fixed_spend,
    topup_amount,
    total_spend,
    energy_kwh,
    weighted_tariff,
    peak_tariff,
    all_in_rate,
    balance_end,
    latest_period,
    energy_intervals,
    is_complete,
    updated_at,
    sync_run_id
  )
  select
    daily_aggregates.period_date,
    coalesce(daily_aggregates.energy_spend, 0),
    coalesce(daily_aggregates.fixed_spend, 0),
    coalesce(daily_aggregates.topup_amount, 0),
    coalesce(daily_aggregates.total_spend, 0),
    coalesce(daily_aggregates.energy_kwh, 0),
    coalesce(daily_aggregates.weighted_tariff, 0),
    coalesce(daily_aggregates.peak_tariff, 0),
    coalesce(daily_aggregates.all_in_rate, 0),
    coalesce(daily_latest.balance_end, 0),
    daily_latest.latest_period,
    coalesce(daily_aggregates.energy_intervals, 0),
    coalesce(daily_aggregates.is_complete, false),
    now(),
    p_run_id
  from daily_aggregates
  left join daily_latest using (period_date)
  order by daily_aggregates.period_date;

  with affected_dates as (
    select distinct public.parse_livenopay_period_ts(period_dt)::date as period_date
    from public.energy_rows
    where sync_run_id = p_run_id
  ),
  hourly_aggregates as (
    select
      public.parse_livenopay_period_ts(period_dt)::date as period_date,
      extract(hour from public.parse_livenopay_period_ts(period_dt))::smallint as hour,
      round(sum(case when charge_kind = 'energy' then cost else 0 end)::numeric, 2) as spend,
      round(sum(case when charge_kind = 'energy' then kwh else 0 end)::numeric, 4) as kwh,
      count(*)::integer as intervals
    from public.energy_rows
    where charge_kind = 'energy'
      and public.parse_livenopay_period_ts(period_dt)::date in (select period_date from affected_dates)
    group by 1, 2
  )
  insert into public.energy_hourly_rollups (
    period_date,
    hour,
    spend,
    kwh,
    intervals,
    updated_at,
    sync_run_id
  )
  select
    period_date,
    hour,
    spend,
    kwh,
    intervals,
    now(),
    p_run_id
  from hourly_aggregates
  order by period_date, hour;

  with affected_dates as (
    select distinct public.parse_livenopay_period_ts(period_dt)::date as period_date
    from public.energy_rows
    where sync_run_id = p_run_id
  ),
  interval_aggregates as (
    select
      public.parse_livenopay_period_ts(period_dt)::date as period_date,
      substring(period_dt from 12 for 5)::time without time zone as period_time,
      round(sum(case when charge_kind = 'energy' then cost else 0 end)::numeric, 2) as spend,
      round(sum(case when charge_kind = 'energy' then kwh else 0 end)::numeric, 4) as kwh
    from public.energy_rows
    where charge_kind = 'energy'
      and public.parse_livenopay_period_ts(period_dt)::date in (select period_date from affected_dates)
    group by 1, 2
  )
  insert into public.energy_interval_rollups (
    period_date,
    period_time,
    spend,
    kwh,
    updated_at,
    sync_run_id
  )
  select
    period_date,
    period_time,
    spend,
    kwh,
    now(),
    p_run_id
  from interval_aggregates
  order by period_date, period_time;

  update public.dashboard_summary
  set
    date_start = (select min(period_date) from public.energy_day_rollups),
    date_end = (select max(period_date) from public.energy_day_rollups),
    latest_balance = (
      select balance
      from public.energy_rows
      order by public.parse_livenopay_period_ts(period_dt) desc, public.parse_livenopay_capture_ts(capture_dt) desc, id desc
      limit 1
    ),
    latest_period = (
      select period_dt
      from public.energy_rows
      order by public.parse_livenopay_period_ts(period_dt) desc, public.parse_livenopay_capture_ts(capture_dt) desc, id desc
      limit 1
    ),
    last_synced_at = run_record.finished_at,
    rows_in_csv = run_record.rows_in_csv,
    rows_synced = run_record.rows_synced,
    max_interval_spend = coalesce((select max(spend) from public.energy_interval_rollups), 0),
    max_interval_kwh = coalesce((select max(kwh) from public.energy_interval_rollups), 0),
    updated_at = now(),
    sync_run_id = p_run_id
  where id = 1;
end;
$$;

create or replace function public.handle_livenopay_capture_run_refresh()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'success' and new.finished_at is not null then
    perform public.refresh_livenopay_rollups(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists capture_runs_refresh_rollups on public.capture_runs;
create trigger capture_runs_refresh_rollups
  after insert or update on public.capture_runs
  for each row
  execute function public.handle_livenopay_capture_run_refresh();

alter table public.energy_day_rollups enable row level security;
alter table public.energy_hourly_rollups enable row level security;
alter table public.energy_interval_rollups enable row level security;
alter table public.dashboard_summary enable row level security;

drop policy if exists "energy day rollups are readable" on public.energy_day_rollups;
create policy "energy day rollups are readable"
  on public.energy_day_rollups
  for select
  to anon
  using (true);

drop policy if exists "energy hourly rollups are readable" on public.energy_hourly_rollups;
create policy "energy hourly rollups are readable"
  on public.energy_hourly_rollups
  for select
  to anon
  using (true);

drop policy if exists "energy interval rollups are readable" on public.energy_interval_rollups;
create policy "energy interval rollups are readable"
  on public.energy_interval_rollups
  for select
  to anon
  using (true);

drop policy if exists "dashboard summary is readable" on public.dashboard_summary;
create policy "dashboard summary is readable"
  on public.dashboard_summary
  for select
  to anon
  using (true);

do $$
declare
  run_record record;
begin
  for run_record in
    select id
    from public.capture_runs
    where status = 'success'
    order by finished_at asc, started_at asc
  loop
    perform public.refresh_livenopay_rollups(run_record.id);
  end loop;
end $$;


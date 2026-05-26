create or replace function public.refresh_livenopay_rollups_for_run(p_run_id uuid)
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
    raise exception 'capture run % not found', p_run_id;
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
      to_char(public.parse_livenopay_period_ts(period_dt), 'HH24:MI') as period_time,
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
      order by source_ts desc nulls last, public.parse_livenopay_capture_ts(capture_dt) desc, public.parse_livenopay_period_ts(period_dt) desc, id desc
      limit 1
    ),
    latest_period = (
      select period_dt
      from public.energy_rows
      order by source_ts desc nulls last, public.parse_livenopay_capture_ts(capture_dt) desc, public.parse_livenopay_period_ts(period_dt) desc, id desc
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

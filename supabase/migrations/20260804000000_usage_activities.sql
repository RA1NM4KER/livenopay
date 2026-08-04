create or replace function public.usage_activity_tags_valid(value text[])
returns boolean
language sql
immutable
as $$
  select cardinality(value) between 1 and 10
    and not exists (
      select 1
      from unnest(value) tag
      where tag = ''
        or char_length(tag) > 30
        or tag <> lower(btrim(tag))
    )
    and cardinality(value) = (select count(distinct tag) from unnest(value) tag);
$$;

create table if not exists public.usage_activities (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.livemopay_connections(id) on delete cascade,
  starts_at timestamp without time zone not null,
  ends_at timestamp without time zone not null,
  all_day boolean not null default false,
  tags text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_activities_time_order check (ends_at > starts_at),
  constraint usage_activities_half_hour_start check (
    extract(second from starts_at) = 0
    and extract(minute from starts_at)::integer in (0, 30)
  ),
  constraint usage_activities_half_hour_end check (
    extract(second from ends_at) = 0
    and extract(minute from ends_at)::integer in (0, 30)
  ),
  constraint usage_activities_tags_valid check (public.usage_activity_tags_valid(tags)),
  constraint usage_activities_note_length check (note is null or char_length(note) <= 500),
  constraint usage_activities_all_day_bounds check (
    not all_day
    or (
      starts_at::time = time '00:00'
      and ends_at = starts_at + interval '1 day'
    )
  )
);

create index if not exists usage_activities_connection_time_idx
  on public.usage_activities (connection_id, starts_at, ends_at);

create index if not exists usage_activities_tags_idx
  on public.usage_activities using gin (tags);

-- Supports the range join used by both report functions without scanning a
-- connection's complete interval history for every filtered activity.
create index if not exists energy_interval_rollups_connection_timestamp_idx
  on public.energy_interval_rollups (connection_id, (period_date + period_time));

create or replace function public.set_usage_activity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists usage_activities_set_updated_at on public.usage_activities;
create trigger usage_activities_set_updated_at
before update on public.usage_activities
for each row execute function public.set_usage_activity_updated_at();

alter table public.usage_activities enable row level security;

drop policy if exists "usage activities are readable by owner" on public.usage_activities;
create policy "usage activities are readable by owner"
  on public.usage_activities for select to authenticated
  using (connection_id = public.my_livemopay_connection_id());

drop policy if exists "usage activities are insertable by owner" on public.usage_activities;
create policy "usage activities are insertable by owner"
  on public.usage_activities for insert to authenticated
  with check (connection_id = public.my_livemopay_connection_id());

drop policy if exists "usage activities are updatable by owner" on public.usage_activities;
create policy "usage activities are updatable by owner"
  on public.usage_activities for update to authenticated
  using (connection_id = public.my_livemopay_connection_id())
  with check (connection_id = public.my_livemopay_connection_id());

drop policy if exists "usage activities are deletable by owner" on public.usage_activities;
create policy "usage activities are deletable by owner"
  on public.usage_activities for delete to authenticated
  using (connection_id = public.my_livemopay_connection_id());

revoke all on public.usage_activities from anon;
grant select, insert, update, delete on public.usage_activities to authenticated;

-- period_date + period_time is treated as the START of its 30-minute meter
-- interval. Activities and interval joins therefore use [starts_at, ends_at).
create or replace function public.usage_activity_report(
  p_from date,
  p_to date,
  p_tags text[] default null,
  p_utility text default 'all'
)
returns table (
  id uuid,
  starts_at timestamp without time zone,
  ends_at timestamp without time zone,
  all_day boolean,
  tags text[],
  note text,
  created_at timestamptz,
  updated_at timestamptz,
  duration_minutes integer,
  electricity_kwh numeric,
  average_kw numeric,
  electricity_spend numeric,
  water_kl numeric,
  water_spend numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    activity.id,
    activity.starts_at,
    activity.ends_at,
    activity.all_day,
    activity.tags,
    activity.note,
    activity.created_at,
    activity.updated_at,
    extract(epoch from (activity.ends_at - activity.starts_at))::integer / 60 as duration_minutes,
    coalesce(sum(interval_row.kwh), 0)::numeric as electricity_kwh,
    (
      coalesce(sum(interval_row.kwh), 0)
      / nullif(extract(epoch from (activity.ends_at - activity.starts_at)) / 3600, 0)
    )::numeric as average_kw,
    coalesce(sum(interval_row.spend), 0)::numeric as electricity_spend,
    coalesce(sum(interval_row.water_kl), 0)::numeric as water_kl,
    coalesce(sum(interval_row.water_spend), 0)::numeric as water_spend
  from public.usage_activities activity
  left join public.energy_interval_rollups interval_row
    on interval_row.connection_id = activity.connection_id
   and interval_row.period_date + interval_row.period_time >= activity.starts_at
   and interval_row.period_date + interval_row.period_time < activity.ends_at
  where activity.connection_id = public.my_livemopay_connection_id()
    and activity.starts_at < (p_to + 1)::timestamp
    and activity.ends_at > p_from::timestamp
    and (p_tags is null or cardinality(p_tags) = 0 or activity.tags && p_tags)
  group by activity.id
  having p_utility = 'all'
    or (p_utility = 'electricity' and coalesce(sum(interval_row.kwh), 0) > 0)
    or (p_utility = 'water' and coalesce(sum(interval_row.water_kl), 0) > 0)
  order by activity.starts_at asc, activity.created_at asc;
$$;

create or replace function public.usage_activity_report_summary(
  p_from date,
  p_to date,
  p_tags text[] default null,
  p_utility text default 'all'
)
returns table (
  activity_count integer,
  tagged_duration_minutes integer,
  electricity_kwh numeric,
  average_electricity_kwh_per_activity numeric,
  electricity_spend numeric,
  water_kl numeric,
  water_spend numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select *
    from public.usage_activities activity
    where activity.connection_id = public.my_livemopay_connection_id()
      and activity.starts_at < (p_to + 1)::timestamp
      and activity.ends_at > p_from::timestamp
      and (p_tags is null or cardinality(p_tags) = 0 or activity.tags && p_tags)
      and (
        p_utility = 'all'
        or exists (
          select 1
          from public.energy_interval_rollups utility_interval
          where utility_interval.connection_id = activity.connection_id
            and utility_interval.period_date + utility_interval.period_time >= activity.starts_at
            and utility_interval.period_date + utility_interval.period_time < activity.ends_at
            and (
              (p_utility = 'electricity' and utility_interval.kwh > 0)
              or (p_utility = 'water' and utility_interval.water_kl > 0)
            )
        )
      )
  ),
  distinct_slots as (
    select distinct generated.slot_start
    from filtered activity
    cross join lateral generate_series(
      activity.starts_at,
      activity.ends_at - interval '30 minutes',
      interval '30 minutes'
    ) as generated(slot_start)
  ),
  unique_usage as (
    select
      coalesce(sum(interval_row.kwh), 0)::numeric as electricity_kwh,
      coalesce(sum(interval_row.spend), 0)::numeric as electricity_spend,
      coalesce(sum(interval_row.water_kl), 0)::numeric as water_kl,
      coalesce(sum(interval_row.water_spend), 0)::numeric as water_spend
    from public.energy_interval_rollups interval_row
    join distinct_slots slot
      on interval_row.connection_id = public.my_livemopay_connection_id()
     and interval_row.period_date + interval_row.period_time = slot.slot_start
  ),
  occurrence_usage as (
    select coalesce(sum(report.electricity_kwh), 0)::numeric as total_kwh
    from public.usage_activity_report(p_from, p_to, p_tags, p_utility) report
  )
  select
    (select count(*)::integer from filtered),
    (select count(*)::integer * 30 from distinct_slots),
    unique_usage.electricity_kwh,
    occurrence_usage.total_kwh / nullif((select count(*) from filtered), 0),
    unique_usage.electricity_spend,
    unique_usage.water_kl,
    unique_usage.water_spend
  from unique_usage, occurrence_usage;
$$;

revoke all on function public.usage_activity_report(date, date, text[], text) from public;
revoke all on function public.usage_activity_report_summary(date, date, text[], text) from public;
grant execute on function public.usage_activity_report(date, date, text[], text) to authenticated;
grant execute on function public.usage_activity_report_summary(date, date, text[], text) to authenticated;

-- Consolidate the Live overview read into ONE database round trip.
--
-- Before: the overview API made ~6 separate PostgREST reads (resolve the user's
-- connection ids, resolve the device, then latest pulses + windowed series +
-- two counts), each a separate network hop taken at a slightly different
-- instant -- so the counts/series could be mutually inconsistent under load.
--
-- This function does all of that retrieval in a single query/snapshot and
-- returns one JSON document. It performs DATA RETRIEVAL + counts only; every
-- presentation calculation (watts, bucketing, freshness, kWh) stays in the pure
-- TypeScript modules (live-meter-calc.ts). SQL is used for what belongs next to
-- the data, not for business logic.
--
-- Security model (unchanged from the REST path it replaces):
--   * Scoped strictly to p_user_id -- the device is resolved via the user's own
--     livemopay_connections; no client-supplied device/connection id is trusted.
--   * NOT security definer. It is invoked only by the server with the
--     service-role key; execute is revoked from anon/authenticated so the
--     browser cannot call it directly, and only service_role may execute it.
--   * search_path pinned to public, pg_temp so name resolution can't be
--     hijacked.
--   * Selects only presentation fields of the device -- api_key_hash / key_hint
--     never appear in the result.
--
-- Device-selection rule preserved: the most recently seen ENABLED device among
-- the user's connections (last_seen_at desc, nulls last), never a blind merge.
create or replace function public.live_meter_overview(
  p_user_id uuid,
  p_window_start timestamptz,
  p_five_min timestamptz,
  p_one_hour timestamptz,
  p_hero_lookback integer,
  p_series_cap integer
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with device as (
    select d.id, d.name, d.pulses_per_kwh
    from public.meter_devices d
    join public.livemopay_connections c on c.id = d.connection_id
    where c.user_id = p_user_id
      and d.enabled = true
    order by d.last_seen_at desc nulls last
    limit 1
  ),
  latest as (
    select p.observed_at, p.delta_ms
    from public.meter_pulses p
    join device on device.id = p.device_id
    order by p.observed_at desc
    limit greatest(p_hero_lookback, 0)
  ),
  series as (
    select p.observed_at, p.delta_ms
    from public.meter_pulses p
    join device on device.id = p.device_id
    where p.observed_at >= p_window_start
    order by p.observed_at asc
    limit greatest(p_series_cap, 0)
  )
  select jsonb_build_object(
    'device', (select to_jsonb(d) from device d),
    'latest', coalesce((select jsonb_agg(to_jsonb(l)) from latest l), '[]'::jsonb),
    'series', coalesce((select jsonb_agg(to_jsonb(s)) from series s), '[]'::jsonb),
    'count5m', coalesce((
      select count(*) from public.meter_pulses p
      join device on device.id = p.device_id
      where p.observed_at >= p_five_min
    ), 0),
    'count1h', coalesce((
      select count(*) from public.meter_pulses p
      join device on device.id = p.device_id
      where p.observed_at >= p_one_hour
    ), 0)
  );
$$;

revoke all on function public.live_meter_overview(uuid, timestamptz, timestamptz, timestamptz, integer, integer) from public;
revoke execute on function public.live_meter_overview(uuid, timestamptz, timestamptz, timestamptz, integer, integer) from anon, authenticated;
grant execute on function public.live_meter_overview(uuid, timestamptz, timestamptz, timestamptz, integer, integer) to service_role;

-- The existing meter_pulses (device_id, observed_at) index already serves the
-- latest (desc), series (range asc) and count (range) access paths above.
-- livemopay_connections is small per user; meter_devices.connection_id is
-- indexed. No new index is warranted by this query shape.

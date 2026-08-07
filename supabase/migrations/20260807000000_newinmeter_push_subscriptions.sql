-- Web Push subscriptions for the installed PWA. One row per browser/device
-- endpoint. Mirrors the livemopay_connections access model: service-role only,
-- RLS enabled with no anon/authenticated policies, ownership enforced in the
-- /api/push/* route handlers after auth.uid() is resolved -- these rows hold
-- push credentials that must never be enumerable from the browser.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The push service URL. Globally unique per subscription, so it's the
  -- natural conflict target for upserts when a device re-subscribes.
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Same rationale as livemopay_connections: never read from the browser. Every
-- access goes through the service-role client in /api/push/* and the cron
-- stale-check handler, each of which resolves ownership itself.
revoke all on public.push_subscriptions from anon, authenticated;

-- Dedupe state for stale-data push notifications. Lives on the connection, not
-- the subscription, because staleness is a property of the user's data (shared
-- across all their devices), not of any single push endpoint. Set to now()
-- when a "data went stale" push is sent, and cleared once the data is fresh
-- again -- so the cron sends at most one notification per stale episode
-- regardless of how often it runs.
alter table public.livemopay_connections
  add column stale_notified_at timestamptz;

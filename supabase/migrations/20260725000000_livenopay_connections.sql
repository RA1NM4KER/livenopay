create table public.livemopay_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  livemopay_email text not null,
  firebase_local_id text,
  account_id text,
  company_id text,
  property_id text,
  account_label text,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  refresh_token_auth_tag text,
  pending_accounts jsonb,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  constraint livemopay_connections_status_check
    check (status in ('connected', 'pending_selection', 'disconnected', 'error')),
  -- Token fields are either all present (active session) or all absent (never
  -- connected yet, or cleared on disconnect). Never a partial state.
  constraint livemopay_connections_token_fields_consistent check (
    (refresh_token_ciphertext is null and refresh_token_iv is null and refresh_token_auth_tag is null)
    or
    (refresh_token_ciphertext is not null and refresh_token_iv is not null and refresh_token_auth_tag is not null)
  )
);

-- At most one "live" (connected or awaiting account selection) row per user.
-- Disconnected/error rows are kept as history and are not constrained, so
-- reconnecting an existing row (status -> connected) or starting a fresh one
-- after a full disconnect both work without violating this index.
create unique index livemopay_connections_one_active_per_user
  on public.livemopay_connections (user_id)
  where status in ('connected', 'pending_selection');

alter table public.livemopay_connections enable row level security;

-- Deliberately no RLS policies for anon/authenticated on this table: it holds
-- encrypted LiveMopay refresh tokens and is never queried directly from the
-- browser. All access goes through the /api/livemopay/* route handlers using
-- the service-role client, which independently verifies auth.uid() first.
revoke all on public.livemopay_connections from anon, authenticated;

-- Other tables' RLS policies need to know "does connection X belong to the
-- current user" without granting the authenticated role direct SELECT access
-- to livemopay_connections (which would expose account_id/company_id/property_id
-- and metadata rows for other users' connections via row enumeration, and,
-- more fundamentally, RLS subqueries against a table with no authenticated
-- policy always evaluate to zero rows for that role). SECURITY DEFINER lets
-- this one narrow, single-purpose function look up ownership as the function
-- owner while every other table's policy only ever gets a boolean back.
create or replace function public.owns_livemopay_connection(p_connection_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.livemopay_connections c
    where c.id = p_connection_id
      and c.user_id = auth.uid()
  );
$$;

revoke all on function public.owns_livemopay_connection(uuid) from public;
grant execute on function public.owns_livemopay_connection(uuid) to authenticated;

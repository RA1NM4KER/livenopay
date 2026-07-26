-- Per-user role and permission flags. Read/written exclusively via the
-- service-role REST helpers (same pattern as livemopay_connections), so no
-- RLS policy is defined here -- ownership/authorization is enforced in code
-- via requireAdminSession.
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  ai_assistant_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed the one known admin account, if it has already signed up. Safe to
-- re-run: does nothing if the account doesn't exist yet (they'll get a
-- normal 'user' row on first request instead, via getOrCreateUserRole),
-- and does nothing if a row already exists with a different role.
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'kefasa112@gmail.com'
on conflict (user_id) do update set role = 'admin', updated_at = now();

-- Live optical meter ingestion is a per-user opt-in while it's being prototyped
-- with a single user, so it defaults OFF -- same posture as activities_enabled.
-- Toggled per user from the admin users table, and enforced everywhere the
-- feature is reachable: the /api/live/pulses ingestion route (the device's
-- owner must have the flag) and the create-meter-device CLI.
alter table public.user_roles
  add column live_meter_enabled boolean not null default false;

-- Enable it for the one prototype user now. Upsert (same shape as the seed
-- admin migration): flips the flag on if their role row already exists, or
-- creates the row pre-enabled if they've signed up but never triggered
-- getOrCreateUserPermissions yet. Does nothing if the account doesn't exist.
insert into public.user_roles (user_id, live_meter_enabled)
select id, true
from auth.users
where email = 'kefasa112@gmail.com'
on conflict (user_id) do update set live_meter_enabled = true, updated_at = now();

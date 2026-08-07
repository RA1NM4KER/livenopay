-- Realtime Authorization for the Live feature's PRIVATE broadcast channel.
--
-- The Live page subscribes to a per-user topic `live-meter:<auth.uid()>` and
-- receives a minimal "pulses_changed" nudge after new pulses are persisted
-- (the authoritative data still comes from GET /api/live/overview). Private
-- channels gate receipt through Row Level Security on realtime.messages.
--
-- This policy is deliberately narrow (NOT `using (true)`): an authenticated
-- user may RECEIVE broadcast messages only on the topic that matches their own
-- auth.uid(). There is intentionally no INSERT/send policy, so the browser can
-- subscribe/receive but never publish. The server publishes with the
-- service-role key via the Realtime broadcast HTTP endpoint, which bypasses
-- RLS. A feature-disabled user, or any user pointed at someone else's topic,
-- receives nothing.
--
-- Additive and safe: the app used no Realtime before this, so realtime.messages
-- had no policies (default-deny). This grants only the live-meter own-topic
-- case; every other topic remains denied.

create policy "live_meter_owner_receive_broadcast"
on "realtime"."messages"
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) = 'live-meter:' || (select auth.uid())::text
);

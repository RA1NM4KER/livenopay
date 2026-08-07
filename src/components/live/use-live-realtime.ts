"use client";

import { useEffect } from "react";
import { liveMeterTopic, PULSES_CHANGED_EVENT } from "@/lib/live-realtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Subscribes to the authenticated user's PRIVATE Live channel and calls
// onPulsesChanged whenever new pulse data is persisted. The event is only an
// invalidation nudge -- the caller refetches the authoritative overview API.
//
// Production hardening:
// - Private channel (config.private): receipt is gated by the realtime.messages
//   RLS policy, so a user can only ever receive their own live-meter topic.
// - Explicitly attaches the current access token via realtime.setAuth before
//   subscribing, and RE-attaches it on TOKEN_REFRESHED / SIGNED_IN. Without
//   this, the private channel silently stops delivering once the initial JWT
//   expires (~1h) -- the class of bug that makes "realtime worked, then quietly
//   died overnight".
// - The browser only subscribes/receives; it is never granted send/publish.
// - Fires onPulsesChanged once on (re)subscribe to recover anything missed
//   while the socket was down.
// - Cleans up the channel and the auth listener on unmount / userId change.
//
// onPulsesChanged must be stable (wrap in useCallback) to avoid resubscribing.
export function useLiveRealtime(userId: string | null | undefined, onPulsesChanged: () => void): void {
  useEffect(() => {
    if (!userId) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const { data } = await supabase.auth.getSession();
      // Authorize the private channel as this user (RLS evaluates auth.uid()).
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) {
        return;
      }

      channel = supabase
        .channel(liveMeterTopic(userId), { config: { private: true } })
        .on("broadcast", { event: PULSES_CHANGED_EVENT }, () => {
          if (!cancelled) {
            onPulsesChanged();
          }
        })
        .subscribe((status) => {
          // Recover anything missed while the socket was down / on first connect.
          if (status === "SUBSCRIBED" && !cancelled) {
            onPulsesChanged();
          }
        });
    };

    void subscribe();

    // Keep Realtime authorized across hourly token refreshes.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        void supabase.realtime.setAuth(session?.access_token ?? null);
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, onPulsesChanged]);
}

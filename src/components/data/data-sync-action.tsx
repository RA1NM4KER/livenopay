"use client";

import { useEffect } from "react";
import { SyncButton } from "@/components/ui/sync-button";
import { isSyncStale } from "@/lib/sync-status";

type DataSyncActionProps = {
  iconOnly?: boolean;
  lastSyncedAt?: string | null;
  // True while the real lastSyncedAt is still unknown (first load, no cached
  // data yet) -- distinct from lastSyncedAt genuinely being null/undefined
  // because a connected account has never run a sync, which should nudge.
  loading?: boolean;
};

export function DataSyncAction({ iconOnly = false, lastSyncedAt, loading = false }: DataSyncActionProps) {
  const handleSyncSuccess = async () => {
    window.location.reload();
  };

  // Mirrors the in-app nudge dot onto the installed PWA's home-screen icon,
  // using the exact same lastSyncedAt already fetched for this page -- no
  // separate endpoint, so it can't disagree with the visible dot. Rendering
  // on two pages means two calls in the same session; setAppBadge/
  // clearAppBadge are idempotent, so that's harmless. Polled on an interval,
  // not just on lastSyncedAt change, since staleness is time-relative and
  // can flip from false to true with the tab sitting open and no new data.
  useEffect(() => {
    if (loading || typeof navigator === "undefined" || !("setAppBadge" in navigator)) {
      return;
    }

    const updateBadge = () => {
      if (isSyncStale(lastSyncedAt)) {
        navigator.setAppBadge().catch(() => undefined);
      } else {
        navigator.clearAppBadge().catch(() => undefined);
      }
    };

    updateBadge();
    const intervalId = setInterval(updateBadge, 15 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [lastSyncedAt, loading]);

  // Always rendered as the filter bar's leftControls, so it always sits on
  // the bar's dark teal background -- no other caller in this codebase.
  return (
    <SyncButton
      iconOnly={iconOnly}
      onSuccess={handleSyncSuccess}
      tone="dark"
      showNudge={!loading && isSyncStale(lastSyncedAt)}
    />
  );
}

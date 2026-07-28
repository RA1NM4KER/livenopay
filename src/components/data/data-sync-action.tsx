"use client";

import { SyncButton } from "@/components/ui/sync-button";

type DataSyncActionProps = {
  iconOnly?: boolean;
  lastSyncedAt?: string | null;
};

// Threshold picked from observed real-world sync gaps (median ~2-3h, one
// clean 6h+ gap before new rows showed up) -- a soft nudge, not a claim that
// new data is actually ready. See conversation/commit history for the data
// dive this came from if the number ever needs revisiting.
const STALE_AFTER_HOURS = 6;

function isStale(lastSyncedAt?: string | null): boolean {
  if (!lastSyncedAt) {
    return true;
  }

  const hoursSinceSync = (Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000;
  return hoursSinceSync > STALE_AFTER_HOURS;
}

export function DataSyncAction({ iconOnly = false, lastSyncedAt }: DataSyncActionProps) {
  const handleSyncSuccess = async () => {
    window.location.reload();
  };

  // Always rendered as the filter bar's leftControls, so it always sits on
  // the bar's dark teal background -- no other caller in this codebase.
  return (
    <SyncButton
      iconOnly={iconOnly}
      onSuccess={handleSyncSuccess}
      tone="dark"
      showNudge={isStale(lastSyncedAt)}
    />
  );
}

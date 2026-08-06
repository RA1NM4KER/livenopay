// Threshold picked from observed real-world sync gaps (median ~2-3h, one
// clean 6h+ gap before new rows showed up) -- a soft nudge, not a claim that
// new data is actually ready. See conversation/commit history for the data
// dive this came from if the number ever needs revisiting.
export const STALE_AFTER_HOURS = 6;

export function isSyncStale(lastSyncedAt?: string | null): boolean {
  if (!lastSyncedAt) {
    return true;
  }

  const hoursSinceSync = (Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000;
  return hoursSinceSync > STALE_AFTER_HOURS;
}

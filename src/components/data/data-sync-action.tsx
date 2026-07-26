"use client";

import { SyncButton } from "@/components/ui/sync-button";

type DataSyncActionProps = {
  iconOnly?: boolean;
};

export function DataSyncAction({ iconOnly = false }: DataSyncActionProps) {
  const handleSyncSuccess = async () => {
    window.location.reload();
  };

  // Always rendered as the filter bar's leftControls, so it always sits on
  // the bar's dark teal background -- no other caller in this codebase.
  return <SyncButton iconOnly={iconOnly} onSuccess={handleSyncSuccess} tone="dark" />;
}

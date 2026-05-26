"use client";

import { SyncButton } from "@/components/ui/sync-button";

type DataSyncActionProps = {
  iconOnly?: boolean;
};

export function DataSyncAction({ iconOnly = false }: DataSyncActionProps) {
  const handleSyncSuccess = async () => {
    window.location.reload();
  };

  return <SyncButton iconOnly={iconOnly} onSuccess={handleSyncSuccess} />;
}

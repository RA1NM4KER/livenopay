"use client";

import { DataExportAction } from "@/components/data/data-export-action";
import { DataSyncAction } from "@/components/data/data-sync-action";
import { DataTable } from "@/components/data/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export function DataPageClient() {
  return (
    <QueryProvider>
      <AppShell
        mobileHeaderActions={
          <div className="flex items-center gap-2">
            <DataSyncAction iconOnly />
            <DataExportAction />
          </div>
        }
        lockViewport
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <DataTable />
        </div>
      </AppShell>
    </QueryProvider>
  );
}

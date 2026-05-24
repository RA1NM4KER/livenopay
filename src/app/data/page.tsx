import { DataExportAction } from "@/components/data/data-export-action";
import { DataTable } from "@/components/data/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export const dynamic = "force-dynamic";

export default function DataPage() {
  return (
    <AppShell mobileHeaderActions={<DataExportAction />} lockViewport>
      <div className="flex min-h-0 flex-1 flex-col">
        <QueryProvider>
          <DataTable />
        </QueryProvider>
      </div>
    </AppShell>
  );
}

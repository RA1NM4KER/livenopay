import { DataTable } from "@/components/data/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export const dynamic = "force-dynamic";

export default function DataPage() {
  return (
    <AppShell>
      <QueryProvider>
        <DataTable />
      </QueryProvider>
    </AppShell>
  );
}

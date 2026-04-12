import { DataTable } from "@/components/data/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { loadEnergyRows } from "@/lib/csv";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const rows = await loadEnergyRows();

  return (
    <AppShell>
      <DataTable rows={rows} />
    </AppShell>
  );
}

import { DataTable } from "@/components/data/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { loadEnergyData } from "@/lib/energy-data";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const { rows } = await loadEnergyData();

  return (
    <AppShell>
      <DataTable rows={rows} />
    </AppShell>
  );
}

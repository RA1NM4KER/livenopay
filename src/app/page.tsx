import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AppShell } from "@/components/layout/app-shell";
import { loadEnergyRows } from "@/lib/csv";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await loadEnergyRows();

  return (
    <AppShell>
      <DashboardShell rows={rows} />
    </AppShell>
  );
}

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AppShell } from "@/components/layout/app-shell";
import { loadEnergyData } from "@/lib/energy-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { rows, sync } = await loadEnergyData();

  return (
    <AppShell>
      <DashboardShell rows={rows} sync={sync} />
    </AppShell>
  );
}

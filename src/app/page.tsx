import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { loadDashboardDailyRollups, loadDashboardHourlyRollups, loadDashboardSummary } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  await searchParams;
  const [summary, dailyRows, hourlyRows] = await Promise.all([
    loadDashboardSummary(),
    loadDashboardDailyRollups(),
    loadDashboardHourlyRollups()
  ]);

  return (
    <AppShell>
      <QueryProvider>
        <DashboardShell dailyRows={dailyRows} hourlyRows={hourlyRows} summary={summary} />
      </QueryProvider>
    </AppShell>
  );
}

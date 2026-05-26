import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { loadDashboardDailyRollups, loadDashboardHourlyRollups, loadDashboardSummary } from "@/lib/dashboard-data";
import { filterQueryParamKeys } from "@/lib/filter-query-params";
import { defaultRange } from "@/lib/filters";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as Record<string, string | string[] | undefined>;
  const summary = await loadDashboardSummary();
  const fromParam =
    typeof resolvedSearchParams[filterQueryParamKeys.from] === "string"
      ? resolvedSearchParams[filterQueryParamKeys.from]
      : "";
  const toParam =
    typeof resolvedSearchParams[filterQueryParamKeys.to] === "string"
      ? resolvedSearchParams[filterQueryParamKeys.to]
      : "";

  if (!fromParam || !toParam) {
    const fallback = defaultRange({ from: summary.dateStart, to: summary.dateEnd });
    if (fallback.from && fallback.to) {
      const next = new URLSearchParams();
      next.set(filterQueryParamKeys.from, fallback.from);
      next.set(filterQueryParamKeys.to, fallback.to);
      redirect(`/?${next.toString()}`);
    }
  }

  const [dailyRows, hourlyRows] = await Promise.all([loadDashboardDailyRollups(), loadDashboardHourlyRollups()]);

  return (
    <AppShell>
      <QueryProvider>
        <DashboardShell dailyRows={dailyRows} hourlyRows={hourlyRows} summary={summary} />
      </QueryProvider>
    </AppShell>
  );
}

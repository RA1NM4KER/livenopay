import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { dateRangeQueryUpdates, parseDateRangeQuery } from "@/lib/filter-query-params";
import { loadDashboardDailyRollups, loadDashboardHourlyRollups, loadDashboardSummary } from "@/lib/dashboard-data";
import { applyQueryUpdates, queryHref } from "@/lib/url-query";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  return params;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const urlSearchParams = toUrlSearchParams(resolvedSearchParams);
  const [summary, dailyRows, hourlyRows] = await Promise.all([
    loadDashboardSummary(),
    loadDashboardDailyRollups(),
    loadDashboardHourlyRollups()
  ]);
  const { from, to } = parseDateRangeQuery(urlSearchParams);

  if ((!from || !to) && summary.dateStart && summary.dateEnd) {
    const nextParams = applyQueryUpdates(urlSearchParams, dateRangeQueryUpdates(summary.dateStart, summary.dateEnd));

    redirect(queryHref("/", nextParams));
  }

  return (
    <AppShell>
      <QueryProvider>
        <DashboardShell dailyRows={dailyRows} hourlyRows={hourlyRows} summary={summary} />
      </QueryProvider>
    </AppShell>
  );
}

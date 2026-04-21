import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AppShell } from "@/components/layout/app-shell";
import { dateRangeQueryUpdates, parseDateRangeQuery } from "@/lib/filter-query-params";
import { defaultRange } from "@/lib/filters";
import { loadEnergyData } from "@/lib/energy-data";
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
  const { rows, sync } = await loadEnergyData();
  const { from, to } = parseDateRangeQuery(urlSearchParams);
  const defaultDateRange = defaultRange(rows);

  if ((!from || !to) && defaultDateRange.from && defaultDateRange.to) {
    const nextParams = applyQueryUpdates(
      urlSearchParams,
      dateRangeQueryUpdates(defaultDateRange.from, defaultDateRange.to)
    );

    redirect(queryHref("/", nextParams));
  }

  return (
    <AppShell>
      <DashboardShell rows={rows} sync={sync} />
    </AppShell>
  );
}

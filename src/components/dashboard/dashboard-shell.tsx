"use client";

import { useMemo } from "react";
import { CumulativeSpendChart } from "@/components/charts/cumulative-spend-chart";
import { DayBreakdownChart } from "@/components/charts/day-breakdown-chart";
import { DailyKwhChart } from "@/components/charts/daily-kwh-chart";
import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { HourlyChart } from "@/components/charts/hourly-chart";
import { TariffChart } from "@/components/charts/tariff-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { createAnalytics } from "@/lib/analytics";
import { buildGlobalDomains } from "@/lib/day-breakdown";
import { useFilterUrlState } from "@/lib/use-filter-url-state";
import { formatCurrency, formatKwh, formatTariff, longDateTime, shortDate } from "@/lib/format";
import { FilterBar } from "./filter-bar";
import { Insights } from "./insights";
import type { DashboardShellProps } from "./types";

const syncFormatter = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg"
});

function syncLabel(value?: string) {
  if (!value) {
    return "Never synced";
  }

  return `${syncFormatter.format(new Date(value))} UTC+2`;
}

export function DashboardShell({ dailyRows, hourlyRows, summary }: DashboardShellProps) {
  const { from, to, quickRange, onDateChange, onQuickRange } = useFilterUrlState({
    from: summary.dateStart,
    to: summary.dateEnd
  });
  const analytics = useMemo(() => createAnalytics(dailyRows, hourlyRows, from, to), [dailyRows, hourlyRows, from, to]);
  const dateOptions = useMemo(
    () => Array.from(new Set(dailyRows.map((row) => row.periodDate))).sort((left, right) => left.localeCompare(right)),
    [dailyRows]
  );

  const globalDomains =
    summary.maxIntervalSpend !== undefined && summary.maxIntervalKwh !== undefined
      ? buildGlobalDomains(summary.maxIntervalSpend, summary.maxIntervalKwh)
      : undefined;

  const metrics = analytics.metrics;

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className=" text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
          A clearer view of your LiveMopay usage and spend.
        </h2>
        <div className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm sm:w-auto">
          <p className="font-medium text-ink">Last synced</p>
          <p className="mt-1 text-muted">{syncLabel(summary.lastSyncedAt)}</p>
          {typeof summary.rowsInCsv === "number" ? (
            <p className="mt-1 text-xs text-muted">{summary.rowsInCsv} rows synced from CSV</p>
          ) : null}
        </div>
      </div>

      <FilterBar from={from} to={to} quickRange={quickRange} onDateChange={onDateChange} onQuickRange={onQuickRange} />

      <section className="snap-rail -mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 sm:pb-0 lg:grid-cols-4 [&>section]:min-w-[16rem] [&>section]:snap-start sm:[&>section]:min-w-0">
        <MetricCard
          label="Total spend"
          value={formatCurrency(metrics.totalSpend)}
          detail={`incl. ${formatCurrency(metrics.totalFixedSpend)} fixed`}
        />
        <MetricCard
          label="Total usage"
          value={formatKwh(metrics.totalKwh)}
          detail={`${formatKwh(metrics.averageKwhPerDay)} per day`}
        />
        <MetricCard
          label="Effective rate"
          value={formatTariff(metrics.energyCostPerKwh)}
          detail={`${formatTariff(metrics.allInCostPerKwh)} incl. fixed`}
        />
        <MetricCard
          label="Average spend"
          value={formatCurrency(metrics.averageSpendPerDay)}
          detail={`per day, incl. ${formatCurrency(metrics.totalFixedSpend / metrics.dayCount)} fixed captured/day`}
        />
        <MetricCard
          label="Latest balance"
          value={typeof metrics.latestBalance === "number" ? formatCurrency(metrics.latestBalance) : "n/a"}
          detail={metrics.latestPeriod ? longDateTime(metrics.latestPeriod) : undefined}
        />
        <MetricCard
          label="Highest spend day"
          value={metrics.highestSpendDay ? formatCurrency(metrics.highestSpendDay.spend) : "n/a"}
          detail={metrics.highestSpendDay ? `${shortDate(metrics.highestSpendDay.date)} incl. fixed` : undefined}
        />
        <MetricCard
          label="Highest usage day"
          value={metrics.highestUsageDay ? formatKwh(metrics.highestUsageDay.kwh) : "n/a"}
          detail={metrics.highestUsageDay ? shortDate(metrics.highestUsageDay.date) : undefined}
        />
        <MetricCard
          label="Highest usage hour"
          value={metrics.highestUsageHour ? formatKwh(metrics.highestUsageHour.kwh) : "n/a"}
          detail={
            metrics.highestUsageHour
              ? `${metrics.highestUsageHour.date} ${metrics.highestUsageHour.hour} · ${formatCurrency(metrics.highestUsageHour.spend)} energy only`
              : undefined
          }
        />
      </section>

      <section className="snap-rail -mx-3 flex snap-x gap-5 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0 lg:pb-0 [&>section]:min-w-[88vw] [&>section]:snap-center sm:[&>section]:min-w-[24rem] lg:[&>section]:min-w-0">
        <DailySpendChart data={analytics.daily} />
        <DailyKwhChart data={analytics.daily} />
      </section>

      <DayBreakdownChart
        dailyRows={dailyRows}
        dateOptions={dateOptions}
        globalDomains={globalDomains}
        initialSelectedDate={summary.dateEnd ?? dateOptions[dateOptions.length - 1]}
      />

      <section className="snap-rail -mx-3 flex snap-x gap-5 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0 lg:pb-0 [&>section]:min-w-[88vw] [&>section]:snap-center sm:[&>section]:min-w-[24rem] lg:[&>section]:min-w-0">
        <CumulativeSpendChart data={analytics.daily} />
        <TariffChart data={analytics.tariffTimeline} />
        <HourlyChart data={analytics.hourly} metric="spend" title="Total energy spend by hour" />
        <HourlyChart data={analytics.hourly} metric="kwh" title="Total energy usage by hour" />
      </section>

      <Insights insights={analytics.insights} />
    </div>
  );
}

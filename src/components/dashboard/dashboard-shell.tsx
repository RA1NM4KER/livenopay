"use client";

import { useMemo, useState } from "react";
import { CumulativeSpendChart } from "@/components/charts/cumulative-spend-chart";
import { DayBreakdownChart } from "@/components/charts/day-breakdown-chart";
import { DailyKwhChart } from "@/components/charts/daily-kwh-chart";
import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { HourlyChart } from "@/components/charts/hourly-chart";
import { TariffChart } from "@/components/charts/tariff-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { createAnalytics, filterRowsByRange } from "@/lib/analytics";
import { defaultRange, quickRangeFromLatest, type QuickRange } from "@/lib/filters";
import { formatCurrency, formatKwh, formatTariff, longDateTime, shortDate } from "@/lib/format";
import type { EnergyRow } from "@/lib/types";
import { FilterBar } from "./filter-bar";
import { Insights } from "./insights";
import { RefreshCapture } from "./refresh-capture";

export function DashboardShell({ rows }: { rows: EnergyRow[] }) {
  const initialRange = useMemo(() => defaultRange(rows), [rows]);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [quickRange, setQuickRange] = useState<QuickRange>(initialRange.quickRange);
  const [selectedDay, setSelectedDay] = useState(initialRange.to);

  const analytics = useMemo(() => createAnalytics(filterRowsByRange(rows, from, to)), [from, rows, to]);

  function updateDates(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setQuickRange("all");
  }

  function updateQuickRange(range: QuickRange) {
    const nextRange = quickRangeFromLatest(rows, range);
    setFrom(nextRange.from);
    setTo(nextRange.to);
    setQuickRange(nextRange.quickRange);
  }

  const metrics = analytics.metrics;

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {metrics.dateStart && metrics.dateEnd
              ? `${shortDate(metrics.dateStart)} to ${shortDate(metrics.dateEnd)}`
              : "No data loaded"}
          </p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            A clearer view of your LiveMopay usage and spend.
          </h2>
        </div>
        <RefreshCapture />
      </div>

      <FilterBar
        from={from}
        to={to}
        quickRange={quickRange}
        onDateChange={updateDates}
        onQuickRange={updateQuickRange}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="grid gap-5 lg:grid-cols-2">
        <DailySpendChart data={analytics.daily} />
        <DailyKwhChart data={analytics.daily} />
      </section>

      <DayBreakdownChart rows={rows} selectedDate={selectedDay} onDateChange={setSelectedDay} />

      <section className="grid gap-5 lg:grid-cols-2">
        <CumulativeSpendChart data={analytics.daily} />
        <TariffChart data={analytics.tariffTimeline} />
        <HourlyChart data={analytics.hourly} metric="spend" title="Total energy spend by hour" />
        <HourlyChart data={analytics.hourly} metric="kwh" title="Total energy usage by hour" />
      </section>

      <Insights insights={analytics.insights} />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { CumulativeSpendChart } from "@/components/charts/cumulative-spend-chart";
import { DayBreakdownChart } from "@/components/charts/day-breakdown-chart";
import { DailyKwhChart } from "@/components/charts/daily-kwh-chart";
import { DailySpendChart } from "@/components/charts/daily-spend-chart";
import { HourlyChart } from "@/components/charts/hourly-chart";
import { TariffChart } from "@/components/charts/tariff-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { createAnalytics } from "@/lib/analytics";
import { buildGlobalDomains } from "@/lib/day-breakdown";
import { previousComparableScope } from "@/lib/period-comparison";
import { useFilterUrlState } from "@/lib/use-filter-url-state";
import { FilterBar } from "./filter-bar";
import { Insights } from "./insights";
import { buildMetricCards } from "./metric-cards";
import type { DashboardShellProps } from "./types";

export function DashboardShell({ dailyRows, hourlyRows, summary }: DashboardShellProps) {
  const { from, to, quickRange, onDateChange, onQuickRange } = useFilterUrlState({
    from: summary.dateStart,
    to: summary.dateEnd
  });
  const analytics = useMemo(
    () =>
      createAnalytics(dailyRows, hourlyRows, from, to, {
        latestBalance: summary.latestBalance,
        latestPeriod: summary.latestPeriod
      }),
    [dailyRows, hourlyRows, from, summary.latestBalance, summary.latestPeriod, to]
  );
  const previousScope = useMemo(() => {
    if (!from || !to) {
      return undefined;
    }

    return previousComparableScope({ from, to });
  }, [from, to]);
  const previousAnalytics = useMemo(() => {
    if (!previousScope) {
      return undefined;
    }

    return createAnalytics(dailyRows, hourlyRows, previousScope.from, previousScope.to);
  }, [dailyRows, hourlyRows, previousScope]);
  const dateOptions = useMemo(
    () => Array.from(new Set(dailyRows.map((row) => row.periodDate))).sort((left, right) => left.localeCompare(right)),
    [dailyRows]
  );
  const globalDomains =
    summary.maxIntervalSpend !== undefined && summary.maxIntervalKwh !== undefined
      ? buildGlobalDomains(
          summary.maxIntervalSpend,
          summary.maxIntervalKwh,
          summary.maxWaterIntervalSpend ?? 0,
          summary.maxWaterIntervalKl ?? 0
        )
      : undefined;

  const metrics = analytics.metrics;
  const metricCards = buildMetricCards(metrics, previousAnalytics?.metrics);

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <div className="hidden flex-wrap items-center justify-between gap-4 sm:flex">
        <h2 className="hidden text-2xl font-semibold tracking-tight text-ink sm:block sm:text-3xl">
          A clearer view of your LiveMopay usage and spend.
        </h2>
      </div>

      <FilterBar
        from={from}
        to={to}
        quickRange={quickRange}
        onDateChange={onDateChange}
        onQuickRange={onQuickRange}
        rightControls={<AssistantPanel from={from} to={to} compact />}
        rightControlsExpanded
      />

      <section className="snap-rail touch-pan-x touch-pan-y flex snap-x gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4 xl:grid-cols-5 [&>section]:min-w-max [&>section]:snap-start sm:[&>section]:min-w-0">
        {metricCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            tone={card.tone}
            comparison={card.comparison}
          />
        ))}
      </section>

      <section className="snap-rail touch-pan-x touch-pan-y -mx-3 flex snap-x gap-5 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0 lg:pb-0 [&>section]:min-w-[88vw] [&>section]:snap-center sm:[&>section]:min-w-[24rem] lg:[&>section]:min-w-0">
        <DailySpendChart data={analytics.daily} />
        <DailyKwhChart data={analytics.daily} />
      </section>

      <DayBreakdownChart
        dailyRows={dailyRows}
        dateOptions={dateOptions}
        globalDomains={globalDomains}
        initialSelectedDate={summary.dateEnd ?? dateOptions[dateOptions.length - 1]}
      />

      <section className="snap-rail touch-pan-x touch-pan-y -mx-3 flex snap-x gap-5 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0 lg:pb-0 [&>section]:min-w-[88vw] [&>section]:snap-center sm:[&>section]:min-w-[24rem] lg:[&>section]:min-w-0">
        <CumulativeSpendChart data={analytics.daily} />
        <TariffChart data={analytics.tariffTimeline} />
        <HourlyChart data={analytics.hourly} metric="spend" title="Total energy spend by hour" />
        <HourlyChart data={analytics.hourly} metric="kwh" title="Total energy usage by hour" />
      </section>

      <Insights insights={analytics.insights} />
    </div>
  );
}

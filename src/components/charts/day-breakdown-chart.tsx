"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { buildIntervalPoints, buildStableAxisDomains, sumRows } from "@/lib/day-breakdown";
import { buildDayIntervalsUrl } from "@/lib/endpoints";
import { formatCurrency, formatKl, formatKwh } from "@/lib/format";
import { ExpandChartButton, ExpandProvider, FullscreenChart } from "./chart-shell";
import { chartColors, chartMargin, chartTooltipStyle } from "./chart-config";
import { DaySummaryCard } from "./day-summary-card";
import type { DayBreakdownChartProps } from "./types";

type IntervalApiResponse = {
  rows: Array<{
    periodDate: string;
    periodTime: string;
    spend: number;
    kwh: number;
    waterSpend: number;
    waterKl: number;
  }>;
};

async function fetchIntervals(periodDate: string) {
  const response = await fetch(buildDayIntervalsUrl(periodDate), {
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to load day intervals.");
  }

  return (await response.json()) as IntervalApiResponse;
}

export function DayBreakdownChart({
  initialSelectedDate,
  dateOptions,
  dailyRows,
  globalDomains
}: DayBreakdownChartProps) {
  const [isCompactAxis, setIsCompactAxis] = useState(false);
  const [utility, setUtility] = useState<"electricity" | "water">("electricity");
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate ?? dateOptions[dateOptions.length - 1] ?? "");
  const selectableDates = useMemo(() => new Set(dateOptions), [dateOptions]);
  const { data } = useQuery({
    queryKey: ["day-intervals", selectedDate],
    queryFn: () => fetchIntervals(selectedDate),
    enabled: Boolean(selectedDate)
  });
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const intervalData = buildIntervalPoints(rows, selectedDate);
  const perDayDomains = useMemo(() => buildStableAxisDomains(rows), [rows]);
  const axisDomains = globalDomains ?? perDayDomains;
  const energySpend = sumRows(rows, "spend");
  const usage = sumRows(rows, "kwh");
  const waterSpend = sumRows(rows, "waterSpend");
  const waterUsage = sumRows(rows, "waterKl");
  const fixedSpend = dailyRows.find((row) => row.periodDate === selectedDate)?.fixedSpend ?? 0;
  const utilityConfig =
    utility === "water"
      ? {
          eyebrow: "30 minute water intervals",
          spendKey: "waterSpend" as const,
          usageKey: "waterKl" as const,
          usageAxisId: "water" as const,
          spendDomain: axisDomains.waterSpend,
          usageDomain: axisDomains.waterKl,
          usageTickFormatter: (value: number) => `${value}`,
          usageFormatter: formatKl,
          usageLabel: "Water usage",
          spendLabel: "Water spend"
        }
      : {
          eyebrow: "30 minute electricity intervals",
          spendKey: "spend" as const,
          usageKey: "kwh" as const,
          usageAxisId: "kwh" as const,
          spendDomain: axisDomains.spend,
          usageDomain: axisDomains.kwh,
          usageTickFormatter: (value: number) => `${value}`,
          usageFormatter: formatKwh,
          usageLabel: "Energy usage",
          spendLabel: "Energy spend"
        };

  useEffect(() => {
    const nextSelectedDate = initialSelectedDate ?? dateOptions[dateOptions.length - 1] ?? "";
    if (nextSelectedDate) {
      setSelectedDate(nextSelectedDate);
    }
  }, [dateOptions, initialSelectedDate]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsCompactAxis(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  const renderChart = (axisInterval: number) => (
    <ResponsiveContainer height="100%" width="100%">
      <ComposedChart data={intervalData} margin={chartMargin}>
        <CartesianGrid stroke={chartColors.line} vertical={false} />
        <XAxis
          dataKey="time"
          interval={axisInterval}
          minTickGap={16}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="spend"
          domain={[0, utilityConfig.spendDomain]}
          tickFormatter={(value) => `R${value}`}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <YAxis
          yAxisId={utilityConfig.usageAxisId}
          domain={[0, utilityConfig.usageDomain]}
          orientation="right"
          tickFormatter={utilityConfig.usageTickFormatter}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value, name) => [
            name === utilityConfig.spendKey
              ? formatCurrency(Number(value))
              : utilityConfig.usageFormatter(Number(value)),
            name === utilityConfig.spendKey ? utilityConfig.spendLabel : utilityConfig.usageLabel
          ]}
        />
        <Bar
          yAxisId={utilityConfig.usageAxisId}
          dataKey={utilityConfig.usageKey}
          fill={chartColors.usage}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="spend"
          dataKey={utilityConfig.spendKey}
          type="monotone"
          stroke={chartColors.spend}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const utilityControl = (
    <DropdownSelect
      ariaLabel="Day detail utility"
      value={utility}
      options={[
        { label: "Electricity", value: "electricity" },
        { label: "Water", value: "water" }
      ]}
      onChange={(value) => setUtility(value as "electricity" | "water")}
      className="w-32"
    />
  );

  const dateControl = (
    <div className="flex items-center gap-2">
      {utilityControl}
      <DatePicker
        closeOnSelect={false}
        label="Day detail date"
        max={dateOptions[dateOptions.length - 1]}
        min={dateOptions[0]}
        onChange={setSelectedDate}
        selectableDates={selectableDates}
        value={selectedDate}
      />
    </div>
  );

  return (
    <ExpandProvider>
      <Card>
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{utilityConfig.eyebrow}</p>
            <ExpandChartButton />
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">Day detail</h2>
            {dateControl}
          </div>
        </div>
        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[1fr_22rem]">
          <div className="h-72 sm:h-80">{renderChart(isCompactAxis ? 7 : 3)}</div>
          <aside className="grid content-start grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-2">
            <DaySummaryCard label="Energy spend" value={formatCurrency(energySpend)} />
            <DaySummaryCard label="Energy usage" value={formatKwh(usage)} />
            <DaySummaryCard label="Water spend" value={formatCurrency(waterSpend)} />
            <DaySummaryCard label="Water usage" value={formatKl(waterUsage)} />
            <DaySummaryCard label="Fixed charges" value={formatCurrency(fixedSpend)} />
          </aside>
        </div>
      </Card>
      <FullscreenChart title="Day detail" action={dateControl}>
        {renderChart(3)}
      </FullscreenChart>
    </ExpandProvider>
  );
}

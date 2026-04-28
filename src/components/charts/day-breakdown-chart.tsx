"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { buildIntervalPoints, buildStableAxisDomains, sumRows } from "@/lib/day-breakdown";
import { formatCurrency, formatKwh } from "@/lib/format";
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
  }>;
};

async function fetchIntervals(periodDate: string) {
  const response = await fetch(`/api/day-intervals?periodDate=${encodeURIComponent(periodDate)}`, {
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
  const fixedSpend = dailyRows.find((row) => row.periodDate === selectedDate)?.fixedSpend ?? 0;

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
      <BarChart data={intervalData} margin={chartMargin}>
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
          domain={[0, axisDomains.spend]}
          tickFormatter={(value) => `R${value}`}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <YAxis
          yAxisId="kwh"
          domain={[0, axisDomains.kwh]}
          orientation="right"
          tickFormatter={(value) => `${value}`}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value, name) => [
            name === "spend" ? formatCurrency(Number(value)) : formatKwh(Number(value)),
            name === "spend" ? "Spend" : "Usage"
          ]}
        />
        <Bar yAxisId="spend" dataKey="spend" fill={chartColors.spend} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="kwh" dataKey="kwh" fill={chartColors.usage} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const dateControl = (
    <DatePicker
      closeOnSelect={false}
      label="Day detail date"
      max={dateOptions[dateOptions.length - 1]}
      min={dateOptions[0]}
      onChange={setSelectedDate}
      selectableDates={selectableDates}
      value={selectedDate}
    />
  );

  return (
    <ExpandProvider>
      <Card>
        <CardHeader
          title="Day detail"
          eyebrow="30 minute view"
          action={
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
              {dateControl}
              <ExpandChartButton />
            </div>
          }
        />
        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[1fr_18rem]">
          <div className="h-72 sm:h-80">{renderChart(isCompactAxis ? 7 : 3)}</div>
          <aside className="grid content-start grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
            <DaySummaryCard label="Energy spend" value={formatCurrency(energySpend)} />
            <DaySummaryCard label="Energy usage" value={formatKwh(usage)} />
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

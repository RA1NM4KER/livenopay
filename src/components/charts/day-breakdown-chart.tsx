"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { buildIntervalPoints, buildStableAxisDomains, sumRows } from "@/lib/day-breakdown";
import { formatCurrency, formatKwh } from "@/lib/format";
import { ExpandChartButton, FullscreenChart } from "./chart-shell";
import { chartColors, chartMargin, chartTooltipStyle } from "./chart-config";
import { DaySummaryCard } from "./day-summary-card";
import type { DayBreakdownChartProps } from "./types";

type DateSelectorProps = {
  dates: string[];
  onChange: (date: string) => void;
  value: string;
};

function DateSelector({ dates, onChange, value }: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative w-auto" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex h-9 w-auto items-center justify-between gap-3 whitespace-nowrap rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition hover:bg-canvas focus:border-accent"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{value}</span>
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect height="18" rx="2" width="18" x="3" y="4" />
          <path d="M3 10h18" />
        </svg>
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 z-30 mt-2 max-h-72 w-max min-w-full overflow-auto rounded-lg border border-line bg-paper p-2 shadow-soft"
          role="dialog"
        >
          <div className="grid gap-1">
            {dates.map((date) => (
              <button
                className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition ${
                  date === value ? "bg-ink text-paper" : "text-ink hover:bg-canvas"
                }`}
                key={date}
                onClick={() => onChange(date)}
                type="button"
              >
                {date}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DayBreakdownChart({ rows }: DayBreakdownChartProps) {
  const [selectedDate, setSelectedDate] = useState(rows[rows.length - 1]?.periodDate ?? "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompactAxis, setIsCompactAxis] = useState(false);
  const dayRows = rows.filter((row) => row.periodDate === selectedDate);
  const energyRows = dayRows.filter((row) => row.chargeKind === "energy");
  const fixedRows = dayRows.filter((row) => row.chargeKind === "fixed");
  const intervalData = buildIntervalPoints(rows, selectedDate);
  const axisDomains = useMemo(() => buildStableAxisDomains(rows), [rows]);
  const energySpend = sumRows(energyRows, "cost");
  const fixedSpend = sumRows(fixedRows, "cost");
  const usage = sumRows(energyRows, "kwh");
  const dateOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.periodDate))).sort(), [rows]);

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

  const dateControl = <DateSelector dates={dateOptions} onChange={setSelectedDate} value={selectedDate} />;

  return (
    <>
      <Card>
        <CardHeader
          title="Day detail"
          eyebrow="30 minute view"
          action={
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
              {dateControl}
              <ExpandChartButton onClick={() => setIsExpanded(true)} />
            </div>
          }
        />
        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[1fr_18rem]">
          <div className="h-72 sm:h-80">{renderChart(isCompactAxis ? 7 : 3)}</div>
          <aside className="grid content-start gap-3">
            <DaySummaryCard label="Energy spend" value={formatCurrency(energySpend)} />
            <DaySummaryCard label="Energy usage" value={formatKwh(usage)} />
            <DaySummaryCard label="Fixed charges" value={formatCurrency(fixedSpend)} />
          </aside>
        </div>
      </Card>
      {isExpanded ? (
        <FullscreenChart title="Day detail" action={dateControl} onClose={() => setIsExpanded(false)}>
          {renderChart(3)}
        </FullscreenChart>
      ) : null}
    </>
  );
}

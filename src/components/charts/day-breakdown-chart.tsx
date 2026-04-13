"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { buildIntervalPoints, buildStableAxisDomains, sumRows } from "@/lib/day-breakdown";
import { formatCurrency, formatKwh } from "@/lib/format";
import { chartColors, chartMargin, chartTooltipStyle } from "./chart-config";
import { DaySummaryCard } from "./day-summary-card";
import type { DayBreakdownChartProps } from "./types";

export function DayBreakdownChart({ rows }: DayBreakdownChartProps) {
  const [selectedDate, setSelectedDate] = useState(rows[rows.length - 1]?.periodDate ?? "");
  const dayRows = rows.filter((row) => row.periodDate === selectedDate);
  const energyRows = dayRows.filter((row) => row.chargeKind === "energy");
  const fixedRows = dayRows.filter((row) => row.chargeKind === "fixed");
  const intervalData = buildIntervalPoints(rows, selectedDate);
  const axisDomains = useMemo(() => buildStableAxisDomains(rows), [rows]);
  const energySpend = sumRows(energyRows, "cost");
  const fixedSpend = sumRows(fixedRows, "cost");
  const usage = sumRows(energyRows, "kwh");

  return (
    <Card>
      <CardHeader
        title="Day detail"
        eyebrow="30 minute view"
        action={
          <input
            className="h-9 rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-accent"
            onChange={(event) => setSelectedDate(event.target.value)}
            type="date"
            value={selectedDate}
          />
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_18rem]">
        <div className="h-80">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={intervalData} margin={chartMargin}>
              <CartesianGrid stroke={chartColors.line} vertical={false} />
              <XAxis dataKey="time" interval={3} tickLine={false} axisLine={false} />
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
        </div>
        <aside className="grid content-start gap-3">
          <DaySummaryCard label="Energy spend" value={formatCurrency(energySpend)} />
          <DaySummaryCard label="Energy usage" value={formatKwh(usage)} />
          <DaySummaryCard label="Fixed charges" value={formatCurrency(fixedSpend)} />
        </aside>
      </div>
    </Card>
  );
}

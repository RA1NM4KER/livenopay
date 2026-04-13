"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailyPoint } from "@/lib/types";
import { formatCurrency, shortDate } from "@/lib/format";
import { ChartShell } from "./chart-shell";

export function DailySpendChart({ data }: { data: DailyPoint[] }) {
  const latestDay = data[data.length - 1];
  const projectedDay = latestDay && !latestDay.isComplete && latestDay.projectedSpend ? latestDay : undefined;
  const previousDay = projectedDay ? data[data.length - 2] : undefined;
  const chartData = data.map((point) => ({
    ...point,
    actualSpend: projectedDay && point.date === projectedDay.date ? null : point.spend,
    currentSpend: projectedDay && point.date === projectedDay.date ? point.spend : null,
    projectedSpendValue: projectedDay && point.date === projectedDay.date ? projectedDay.projectedSpend : null
  }));

  return (
    <ChartShell
      title="Daily spend"
      eyebrow="Cost"
      action={<span className="pt-1 text-xs font-normal text-muted">incl. fixed</span>}
    >
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--color-line))" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `R${value}`} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            content={({ active, label }) => {
              if (!active || !label) {
                return null;
              }

              const point = chartData.find((item) => item.date === String(label));
              if (!point) {
                return null;
              }

              const isProjectedPoint = projectedDay?.date === point.date;

              return (
                <div className="rounded-[8px] border border-line bg-paper px-4 py-3 text-sm shadow-soft">
                  <div className="mb-2 font-medium text-ink">{shortDate(point.date)}</div>
                  {isProjectedPoint ? (
                    <div className="space-y-1 text-muted">
                      <div>Current spend: {formatCurrency(point.spend)}</div>
                      <div>Projected spend: {formatCurrency(point.projectedSpendValue ?? point.spend)}</div>
                    </div>
                  ) : (
                    <div className="text-muted">Spend: {formatCurrency(point.spend)}</div>
                  )}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="actualSpend"
            stroke="rgb(var(--color-accent))"
            fill="rgb(var(--color-accent-soft))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "rgb(var(--color-accent))", stroke: "rgb(var(--color-paper))", strokeWidth: 2 }}
          />
          <Line
            dataKey="currentSpend"
            stroke="transparent"
            strokeWidth={8}
            dot={{ r: 4, fill: "rgb(var(--color-accent))", stroke: "rgb(var(--color-paper))", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "rgb(var(--color-accent))", stroke: "rgb(var(--color-paper))", strokeWidth: 2 }}
          />
          <Line dataKey="projectedSpendValue" stroke="transparent" strokeWidth={8} dot={false} activeDot={false} />
          {projectedDay ? (
            <ReferenceLine
              ifOverflow="extendDomain"
              isFront
              segment={[
                { x: previousDay?.date ?? projectedDay.date, y: previousDay?.spend ?? projectedDay.spend },
                { x: projectedDay.date, y: projectedDay.projectedSpend }
              ]}
              stroke="rgb(var(--color-projection))"
              strokeDasharray="3 4"
              strokeWidth={2.4}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

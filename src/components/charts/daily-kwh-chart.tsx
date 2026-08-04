"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartDate, formatKwh } from "@/lib/format";
import { chartColors, chartMargin } from "./chart-config";
import { ChartShell } from "./chart-shell";
import { buildDailyKwhChartModel } from "./daily-kwh-chart-model";
import { ProjectedBarShape } from "./projected-bar-shape";
import type { DailyChartProps } from "./types";

export function DailyKwhChart({ data }: DailyChartProps) {
  const { chartData, completedDays, averageKwh } = buildDailyKwhChartModel(data);

  return (
    <ChartShell title="Daily usage" eyebrow="kWh">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} margin={chartMargin}>
          <CartesianGrid stroke={chartColors.line} vertical={false} />
          <XAxis dataKey="date" tickFormatter={chartDate} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}`} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            content={({ active, label }) => {
              if (!active || !label) {
                return null;
              }

              const point = chartData.find((item) => item.date === String(label));
              if (!point) {
                return null;
              }

              return (
                <div className="rounded-[8px] border border-line bg-paper px-4 py-3 text-sm shadow-soft">
                  <div className="mb-2 font-medium text-ink">{chartDate(point.date)}</div>
                  {typeof point.projectedKwh === "number" ? (
                    <div className="space-y-1 text-muted">
                      <div>Current usage: {formatKwh(point.kwh)}</div>
                      <div>Projected usage: {formatKwh(point.projectedKwh)}</div>
                    </div>
                  ) : (
                    <div className="text-muted">Usage: {formatKwh(point.kwh)}</div>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="kwh" stackId="day" fill={chartColors.usage} radius={[4, 4, 0, 0]} />
          <Bar dataKey="projectedKwhRemainder" stackId="day" fill="transparent" shape={<ProjectedBarShape />} />
          {completedDays.length ? (
            <ReferenceLine y={averageKwh} stroke={chartColors.average} strokeDasharray="4 4" strokeWidth={1.5} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKwh, shortDate } from "@/lib/format";
import { chartColors, chartMargin, chartTooltipStyle } from "./chart-config";
import { ChartShell } from "./chart-shell";
import { ProjectedBarShape } from "./projected-bar-shape";
import type { DailyChartProps } from "./types";

export function DailyKwhChart({ data }: DailyChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    projectedKwhRemainder: point.projectedKwh && point.projectedKwh > point.kwh ? point.projectedKwh - point.kwh : 0
  }));

  return (
    <ChartShell title="Daily usage" eyebrow="kWh">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} margin={chartMargin}>
          <CartesianGrid stroke={chartColors.line} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}`} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [
              formatKwh(Number(value)),
              name === "projectedKwhRemainder" ? "Projected remaining" : "Usage"
            ]}
            labelFormatter={(label) => shortDate(String(label))}
          />
          <Bar dataKey="kwh" stackId="day" fill={chartColors.usage} radius={[4, 4, 0, 0]} />
          <Bar dataKey="projectedKwhRemainder" stackId="day" fill="transparent" shape={<ProjectedBarShape />} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

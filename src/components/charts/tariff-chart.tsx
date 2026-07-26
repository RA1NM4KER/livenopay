"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTariff } from "@/lib/format";
import { chartColors, chartMargin, chartTooltipStyle } from "./chart-config";
import { ChartShell } from "./chart-shell";
import type { TariffChartProps } from "./types";

export function TariffChart({ data }: TariffChartProps) {
  return (
    <ChartShell title="Tariff bands" eyebrow="Daily average">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={chartMargin}>
          <CartesianGrid stroke={chartColors.line} vertical={false} />
          <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `R${value}`} tickLine={false} axisLine={false} width={52} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatTariff(Number(value)), "Tariff"]} />
          <Area
            type="monotone"
            dataKey="tariff"
            stroke={chartColors.projection}
            fill="rgb(var(--color-projection) / 0.14)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColors.projection, stroke: chartColors.paper, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTariff } from "@/lib/format";
import { chartColors, chartMargin, chartTooltipStyle } from "./chart-config";
import { ChartShell } from "./chart-shell";
import type { TariffChartProps } from "./types";

export function TariffChart({ data }: TariffChartProps) {
  return (
    <ChartShell title="Tariff bands" eyebrow="Daily average">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={chartMargin}>
          <CartesianGrid stroke={chartColors.line} vertical={false} />
          <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `R${value}`} tickLine={false} axisLine={false} width={52} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatTariff(Number(value)), "Tariff"]} />
          <Line type="monotone" dataKey="tariff" stroke={chartColors.projection} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

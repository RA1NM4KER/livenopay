"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TariffPoint } from "@/lib/types";
import { formatTariff } from "@/lib/format";
import { ChartShell } from "./chart-shell";

export function TariffChart({ data }: { data: TariffPoint[] }) {
  return (
    <ChartShell title="Tariff bands" eyebrow="Daily average">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--color-line))" vertical={false} />
          <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `R${value}`} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(var(--color-paper))",
              borderColor: "rgb(var(--color-line))",
              borderRadius: 8,
              boxShadow: "var(--shadow-soft)",
              color: "rgb(var(--color-ink))"
            }}
            formatter={(value) => [formatTariff(Number(value)), "Tariff"]}
          />
          <Line type="monotone" dataKey="tariff" stroke="rgb(var(--color-projection))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

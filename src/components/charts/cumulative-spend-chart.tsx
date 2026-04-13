"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/lib/types";
import { formatCurrency, shortDate } from "@/lib/format";
import { ChartShell } from "./chart-shell";

export function CumulativeSpendChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartShell title="Cumulative spend" eyebrow="Run rate">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--color-line))" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `R${value}`} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(var(--color-paper))",
              borderColor: "rgb(var(--color-line))",
              borderRadius: 8,
              boxShadow: "var(--shadow-soft)",
              color: "rgb(var(--color-ink))"
            }}
            formatter={(value) => [formatCurrency(Number(value)), "Cumulative"]}
            labelFormatter={(label) => shortDate(String(label))}
          />
          <Line type="monotone" dataKey="cumulativeSpend" stroke="rgb(var(--color-ink))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

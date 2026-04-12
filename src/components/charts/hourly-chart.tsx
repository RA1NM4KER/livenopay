"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourlyPoint } from "@/lib/types";
import { formatCurrency, formatKwh } from "@/lib/format";
import { ChartShell } from "./chart-shell";

export function HourlyChart({ data, metric, title }: { data: HourlyPoint[]; metric: "spend" | "kwh"; title: string }) {
  return (
    <ChartShell title={title} eyebrow="Hour of day">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e4e0d7" vertical={false} />
          <XAxis dataKey="hour" interval={2} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <Tooltip
            contentStyle={{ borderColor: "#e4e0d7", borderRadius: 8, boxShadow: "0 10px 30px rgba(36,35,31,.08)" }}
            formatter={(value) => [
              metric === "spend" ? formatCurrency(Number(value)) : formatKwh(Number(value)),
              metric
            ]}
          />
          <Bar dataKey={metric} fill={metric === "spend" ? "#c7b991" : "#bfc9b6"} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

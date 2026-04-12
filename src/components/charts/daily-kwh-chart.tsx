"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/lib/types";
import { formatKwh, shortDate } from "@/lib/format";
import { ChartShell } from "./chart-shell";

type ProjectedBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function ProjectedBarShape({ x = 0, y = 0, width = 0, height = 0 }: ProjectedBarShapeProps) {
  if (height <= 0 || width <= 0) {
    return null;
  }

  const radius = Math.min(4, width / 2, height);
  const bottom = y + height;
  const right = x + width;

  return (
    <path
      d={[
        `M ${x} ${bottom}`,
        `L ${x} ${y + radius}`,
        `Q ${x} ${y} ${x + radius} ${y}`,
        `L ${right - radius} ${y}`,
        `Q ${right} ${y} ${right} ${y + radius}`,
        `L ${right} ${bottom}`
      ].join(" ")}
      fill="none"
      stroke="#8f7669"
      strokeDasharray="3 3"
      strokeWidth={1.8}
    />
  );
}

export function DailyKwhChart({ data }: { data: DailyPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    projectedKwhRemainder: point.projectedKwh && point.projectedKwh > point.kwh ? point.projectedKwh - point.kwh : 0
  }));

  return (
    <ChartShell title="Daily usage" eyebrow="kWh">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e4e0d7" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}`} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            contentStyle={{ borderColor: "#e4e0d7", borderRadius: 8, boxShadow: "0 10px 30px rgba(36,35,31,.08)" }}
            formatter={(value, name) => [
              formatKwh(Number(value)),
              name === "projectedKwhRemainder" ? "Projected remaining" : "Usage"
            ]}
            labelFormatter={(label) => shortDate(String(label))}
          />
          <Bar dataKey="kwh" stackId="day" fill="#bfc9b6" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="projectedKwhRemainder"
            stackId="day"
            fill="transparent"
            shape={<ProjectedBarShape />}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

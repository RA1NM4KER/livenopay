"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatKwh } from "@/lib/format";
import type { EnergyRow } from "@/lib/types";

type IntervalPoint = {
  time: string;
  spend: number;
  kwh: number;
};

function buildIntervalPoints(rows: EnergyRow[], selectedDate: string) {
  const energyRows = rows.filter((row) => row.chargeKind === "energy" && row.periodDate === selectedDate);
  const byTime = new Map<string, EnergyRow[]>();

  energyRows.forEach((row) => {
    const bucket = byTime.get(row.periodTime) ?? [];
    bucket.push(row);
    byTime.set(row.periodTime, bucket);
  });

  return Array.from({ length: 48 }, (_, index): IntervalPoint => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";
    const time = `${String(hour).padStart(2, "0")}:${minute}`;
    const items = byTime.get(time) ?? [];

    return {
      time,
      spend: Math.round(items.reduce((total, row) => total + row.cost, 0) * 100) / 100,
      kwh: Math.round(items.reduce((total, row) => total + row.kwh, 0) * 100) / 100
    };
  });
}

function sum(rows: EnergyRow[], key: "cost" | "kwh") {
  return rows.reduce((total, row) => total + row[key], 0);
}

export function DayBreakdownChart({
  rows,
  selectedDate,
  onDateChange
}: {
  rows: EnergyRow[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  const dayRows = rows.filter((row) => row.periodDate === selectedDate);
  const energyRows = dayRows.filter((row) => row.chargeKind === "energy");
  const fixedRows = dayRows.filter((row) => row.chargeKind === "fixed");
  const intervalData = buildIntervalPoints(rows, selectedDate);
  const energySpend = sum(energyRows, "cost");
  const fixedSpend = sum(fixedRows, "cost");
  const usage = sum(energyRows, "kwh");

  return (
    <Card>
      <CardHeader
        title="Day detail"
        eyebrow="30 minute view"
        action={
          <input
            className="h-9 rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-accent"
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={selectedDate}
          />
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_18rem]">
        <div className="h-80">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={intervalData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#e4e0d7" vertical={false} />
              <XAxis dataKey="time" interval={3} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="spend"
                tickFormatter={(value) => `R${value}`}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <YAxis
                yAxisId="kwh"
                orientation="right"
                tickFormatter={(value) => `${value}`}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Tooltip
                contentStyle={{ borderColor: "#e4e0d7", borderRadius: 8, boxShadow: "0 10px 30px rgba(36,35,31,.08)" }}
                formatter={(value, name) => [
                  name === "spend" ? formatCurrency(Number(value)) : formatKwh(Number(value)),
                  name === "spend" ? "Spend" : "Usage"
                ]}
              />
              <Bar yAxisId="spend" dataKey="spend" fill="#c7b991" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="kwh" dataKey="kwh" fill="#bfc9b6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <aside className="grid content-start gap-3">
          <div className="rounded-lg border border-line bg-canvas p-4">
            <p className="text-sm text-muted">Energy spend</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatCurrency(energySpend)}</p>
          </div>
          <div className="rounded-lg border border-line bg-canvas p-4">
            <p className="text-sm text-muted">Energy usage</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatKwh(usage)}</p>
          </div>
          <div className="rounded-lg border border-line bg-canvas p-4">
            <p className="text-sm text-muted">Fixed charges</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatCurrency(fixedSpend)}</p>
          </div>
        </aside>
      </div>
    </Card>
  );
}

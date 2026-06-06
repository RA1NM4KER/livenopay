import type { IntervalRollupRow } from "./types";

export type IntervalPoint = {
  time: string;
  spend: number;
  kwh: number;
  waterSpend: number;
  waterKl: number;
};

export type DayBreakdownDomains = {
  spend: number;
  kwh: number;
  waterSpend: number;
  waterKl: number;
};

export function buildIntervalPoints(rows: IntervalRollupRow[], selectedDate: string) {
  const dayRows = rows.filter((row) => row.periodDate === selectedDate);
  const byTime = new Map<string, IntervalRollupRow[]>();

  dayRows.forEach((row) => {
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
      spend: round(items.reduce((total, row) => total + row.spend, 0)),
      kwh: round(items.reduce((total, row) => total + row.kwh, 0)),
      waterSpend: round(items.reduce((total, row) => total + row.waterSpend, 0)),
      waterKl: round(items.reduce((total, row) => total + row.waterKl, 0))
    };
  });
}

export function buildStableAxisDomains(rows: IntervalRollupRow[]): DayBreakdownDomains {
  const intervalTotals = new Map<string, { spend: number; kwh: number; waterSpend: number; waterKl: number }>();

  rows.forEach((row) => {
    const key = `${row.periodDate}-${row.periodTime}`;
    const total = intervalTotals.get(key) ?? { spend: 0, kwh: 0, waterSpend: 0, waterKl: 0 };

    total.spend += row.spend;
    total.kwh += row.kwh;
    total.waterSpend += row.waterSpend;
    total.waterKl += row.waterKl;
    intervalTotals.set(key, total);
  });

  const values = Array.from(intervalTotals.values());
  const maxSpend = Math.max(0, ...values.map((value) => value.spend));
  const maxKwh = Math.max(0, ...values.map((value) => value.kwh));
  const maxWaterSpend = Math.max(0, ...values.map((value) => value.waterSpend));
  const maxWaterKl = Math.max(0, ...values.map((value) => value.waterKl));

  return {
    spend: roundedCeiling(maxSpend, 1),
    kwh: roundedCeiling(maxKwh, 0.5),
    waterSpend: roundedCeiling(maxWaterSpend, 0.1),
    waterKl: roundedCeiling(maxWaterKl, 0.05)
  };
}

export function buildGlobalDomains(
  maxSpend: number,
  maxKwh: number,
  maxWaterSpend = 0,
  maxWaterKl = 0
): DayBreakdownDomains {
  return {
    spend: roundedCeiling(maxSpend, 1),
    kwh: roundedCeiling(maxKwh, 0.5),
    waterSpend: roundedCeiling(maxWaterSpend, 0.1),
    waterKl: roundedCeiling(maxWaterKl, 0.05)
  };
}

export function sumRows(rows: IntervalRollupRow[], key: "spend" | "kwh" | "waterSpend" | "waterKl") {
  return rows.reduce((total, row) => total + row[key], 0);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function roundedCeiling(value: number, step: number) {
  return Math.max(step, Math.ceil(value / step) * step);
}

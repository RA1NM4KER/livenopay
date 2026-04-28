import type { IntervalRollupRow } from "./types";

export type IntervalPoint = {
  time: string;
  spend: number;
  kwh: number;
};

export type DayBreakdownDomains = {
  spend: number;
  kwh: number;
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
      kwh: round(items.reduce((total, row) => total + row.kwh, 0))
    };
  });
}

export function buildStableAxisDomains(rows: IntervalRollupRow[]): DayBreakdownDomains {
  const intervalTotals = new Map<string, { spend: number; kwh: number }>();

  rows.forEach((row) => {
    const key = `${row.periodDate}-${row.periodTime}`;
    const total = intervalTotals.get(key) ?? { spend: 0, kwh: 0 };

    total.spend += row.spend;
    total.kwh += row.kwh;
    intervalTotals.set(key, total);
  });

  const values = Array.from(intervalTotals.values());
  const maxSpend = Math.max(0, ...values.map((value) => value.spend));
  const maxKwh = Math.max(0, ...values.map((value) => value.kwh));

  return {
    spend: roundedCeiling(maxSpend, 1),
    kwh: roundedCeiling(maxKwh, 0.5)
  };
}

export function buildGlobalDomains(maxSpend: number, maxKwh: number): DayBreakdownDomains {
  return {
    spend: roundedCeiling(maxSpend, 1),
    kwh: roundedCeiling(maxKwh, 0.5)
  };
}

export function sumRows(rows: IntervalRollupRow[], key: "spend" | "kwh") {
  return rows.reduce((total, row) => total + row[key], 0);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function roundedCeiling(value: number, step: number) {
  return Math.max(step, Math.ceil(value / step) * step);
}

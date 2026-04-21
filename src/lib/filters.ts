import type { QuickRange } from "./types";

export type QuickRangePreset = Exclude<QuickRange, "custom">;

export const quickRangeOptions: Array<{ label: string; value: QuickRangePreset }> = [
  { label: "All time", value: "allTime" },
  { label: "Past week", value: "pastWeek" },
  { label: "Past month", value: "pastMonth" },
  { label: "Past 3 months", value: "past3Months" },
  { label: "This month", value: "thisMonth" },
  { label: "This week", value: "thisWeek" }
];
new Set(quickRangeOptions.map((option) => option.value));

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;

  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - offset);

  return result;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function subtractMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() - months);

  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfMonth));

  return result;
}

export function defaultRange(bounds: { from?: string; to?: string }) {
  const earliest = bounds.from;
  const latest = bounds.to;

  return {
    from: earliest ?? "",
    to: latest ?? "",
    quickRange: "allTime" as QuickRange
  };
}

export function quickRangeFromLatest(range: QuickRange) {
  if (range === "allTime" || range === "custom") {
    return {
      from: "",
      to: "",
      quickRange: range
    };
  }

  const today = startOfDay(new Date());
  const to = formatIsoDate(today);

  if (range === "pastWeek") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);

    return {
      from: formatIsoDate(from),
      to,
      quickRange: range
    };
  }

  if (range === "pastMonth") {
    const from = subtractMonths(today, 1);

    return {
      from: formatIsoDate(from),
      to,
      quickRange: range
    };
  }

  if (range === "past3Months") {
    const from = subtractMonths(today, 3);

    return {
      from: formatIsoDate(from),
      to,
      quickRange: range
    };
  }

  if (range === "thisMonth") {
    const from = startOfMonth(today);

    return {
      from: formatIsoDate(from),
      to,
      quickRange: range
    };
  }

  if (range === "thisWeek") {
    const from = startOfWeek(today);

    return {
      from: formatIsoDate(from),
      to,
      quickRange: range
    };
  }

  return {
    from: "",
    to: "",
    quickRange: range
  };
}

export function quickRangeFromDates(from: string, to: string): QuickRange {
  if (!from && !to) {
    return "allTime";
  }

  for (const option of quickRangeOptions) {
    const candidate = quickRangeFromLatest(option.value);

    if (candidate.quickRange === option.value && candidate.from === from && candidate.to === to) {
      return option.value;
    }
  }

  return "custom";
}

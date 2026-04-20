"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { defaultRange, quickRangeFromDates, quickRangeFromLatest, type QuickRangePreset } from "@/lib/filters";
import type { EnergyRow, QuickRange } from "@/lib/types";

type FilterUrlState = {
  from: string;
  to: string;
  quickRange: QuickRange;
  onDateChange: (from: string, to: string) => void;
  onQuickRange: (range: QuickRangePreset) => void;
};

const fromParamKey = "from";
const toParamKey = "to";

function resolveStateFromQuery(
  rows: EnergyRow[],
  searchParams: URLSearchParams
): Omit<FilterUrlState, "onDateChange" | "onQuickRange"> {
  const from = searchParams.get(fromParamKey) ?? "";
  const to = searchParams.get(toParamKey) ?? "";

  if (!from || !to) {
    return defaultRange(rows);
  }

  return {
    from,
    to,
    quickRange: quickRangeFromDates(rows, from, to)
  };
}

export function useFilterUrlState(rows: EnergyRow[]): FilterUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = useMemo(() => {
    return resolveStateFromQuery(rows, new URLSearchParams(searchParams.toString()));
  }, [rows, searchParams]);

  const replaceQuery = (next: URLSearchParams) => {
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const onQuickRange = (range: QuickRangePreset) => {
    const next = new URLSearchParams(searchParams.toString());
    const nextRange = quickRangeFromLatest(rows, range);

    if (nextRange.from) {
      next.set(fromParamKey, nextRange.from);
    } else {
      next.delete(fromParamKey);
    }

    if (nextRange.to) {
      next.set(toParamKey, nextRange.to);
    } else {
      next.delete(toParamKey);
    }

    replaceQuery(next);
  };

  const onDateChange = (from: string, to: string) => {
    const next = new URLSearchParams(searchParams.toString());

    if (from) {
      next.set(fromParamKey, from);
    } else {
      next.delete(fromParamKey);
    }

    if (to) {
      next.set(toParamKey, to);
    } else {
      next.delete(toParamKey);
    }

    replaceQuery(next);
  };

  return {
    ...state,
    onDateChange,
    onQuickRange
  };
}

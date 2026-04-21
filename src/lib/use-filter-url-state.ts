"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { defaultRange, quickRangeFromDates, quickRangeFromLatest, type QuickRangePreset } from "@/lib/filters";
import { dateRangeQueryUpdates, parseDateRangeQuery } from "@/lib/filter-query-params";
import { applyQueryUpdates, queryHref } from "@/lib/url-query";
import type { QuickRange } from "@/lib/types";

type FilterUrlState = {
  from: string;
  to: string;
  quickRange: QuickRange;
  onDateChange: (from: string, to: string) => void;
  onQuickRange: (range: QuickRangePreset) => void;
};

function resolveStateFromQuery(
  dateBounds: { from?: string; to?: string },
  searchParams: URLSearchParams
): Omit<FilterUrlState, "onDateChange" | "onQuickRange"> {
  const fallback = defaultRange(dateBounds);
  const { from, to } = parseDateRangeQuery(searchParams);

  if (!from || !to) {
    return fallback;
  }

  if (from === fallback.from && to === fallback.to) {
    return {
      from,
      to,
      quickRange: "allTime"
    };
  }

  return {
    from,
    to,
    quickRange: quickRangeFromDates(from, to)
  };
}

export function useFilterUrlState(dateBounds: { from?: string; to?: string }): FilterUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = useMemo(() => {
    return resolveStateFromQuery(dateBounds, new URLSearchParams(searchParams.toString()));
  }, [dateBounds, searchParams]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const next = applyQueryUpdates(searchParams, updates);
    router.replace(queryHref(pathname, next), { scroll: false });
  };

  const onQuickRange = (range: QuickRangePreset) => {
    const nextRange = quickRangeFromLatest(range);
    updateSearchParams(dateRangeQueryUpdates(nextRange.from, nextRange.to));
  };

  const onDateChange = (from: string, to: string) => {
    updateSearchParams(dateRangeQueryUpdates(from, to));
  };

  return {
    ...state,
    onDateChange,
    onQuickRange
  };
}

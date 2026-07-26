"use client";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { DataSyncAction } from "@/components/data/data-sync-action";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilterUrlState } from "@/lib/use-filter-url-state";

export default function DashboardLoading() {
  const { from, to, quickRange, isPending, onDateChange, onQuickRange } = useFilterUrlState({});

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <FilterBar
        from={from}
        to={to}
        quickRange={quickRange}
        onDateChange={onDateChange}
        onQuickRange={onQuickRange}
        loading={isPending}
        leftControls={<DataSyncAction />}
        rightControls={<AssistantPanel from={from} to={to} compact />}
        rightControlsExpanded
        fullBleed
        sticky
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="rounded-lg border border-line bg-paper/88 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 rounded-lg border border-line bg-paper/88 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-5 h-40 w-full" />
        </div>
        <div className="h-64 rounded-lg border border-line bg-paper/88 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-5 h-40 w-full" />
        </div>
      </div>

      <div className="h-80 rounded-lg border border-line bg-paper/88 p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-5 h-56 w-full" />
      </div>
    </div>
  );
}

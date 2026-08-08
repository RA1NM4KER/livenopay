import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Route-level navigation skeleton for /live. Without this, the segment falls
// back to the group-level (app)/loading.tsx -- the dashboard skeleton (filter
// bar + metric-card rail) -- which is the wrong shape for this page. This
// mirrors the LivePageClient composition (compact header, one instrument card
// with hero + range selector + tall chart + caption, one recent-usage strip)
// so navigating to Live shows a skeleton of the page you're about to see.
export default function LiveLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-4 pt-4 sm:pt-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </header>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 px-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-12 w-40" />
            <Skeleton className="mt-3 h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg sm:w-56" />
        </div>
        <Skeleton className="mx-4 mt-4 h-[280px] rounded-lg sm:mx-6 sm:h-[300px]" />
        <div className="px-4 py-4 sm:px-6">
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper/88 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="px-4 py-4 sm:px-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

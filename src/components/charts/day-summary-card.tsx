import type { DaySummaryCardProps } from "./types";

export function DaySummaryCard({ label, value }: DaySummaryCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-canvas p-3 sm:p-4">
      <p className="text-xs leading-tight text-muted sm:text-sm">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-tight text-ink sm:text-xl">{value}</p>
    </div>
  );
}

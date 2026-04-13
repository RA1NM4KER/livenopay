import type { DaySummaryCardProps } from "./types";

export function DaySummaryCard({ label, value }: DaySummaryCardProps) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

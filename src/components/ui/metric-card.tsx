import { Card } from "./card";
import type { MetricCardProps } from "./types";

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

import { Card } from "./card";
import type { MetricCardProps } from "./types";

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</p>
      {detail ? <p className="mt-2 break-words text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

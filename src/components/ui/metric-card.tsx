import { Card } from "./card";

export function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

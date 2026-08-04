import { formatCurrency, formatKl, formatKwh } from "@/lib/format";
import type { ActivityMetric } from "@/lib/types";

export function formatActivityMetric(metric: ActivityMetric, value: number) {
  if (metric === "electricityKwh") return formatKwh(value);
  if (metric === "averageKw") return `${value.toFixed(2)} kW`;
  if (metric === "waterKl") return formatKl(value);
  return formatCurrency(value);
}

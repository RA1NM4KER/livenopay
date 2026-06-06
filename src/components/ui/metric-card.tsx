import { Card } from "./card";
import type { MetricCardProps } from "./types";

const toneStyles = {
  neutral: "",
  good: "",
  watch: "",
  danger: ""
} as const;

const valueToneStyles = {
  neutral: "",
  good: "text-green-700 dark:text-green-400",
  watch: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400"
} as const;

const comparisonToneStyles = {
  neutral: "text-muted",
  good: "text-green-700 dark:text-green-400",
  watch: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400"
} as const;

export function MetricCard({ label, value, detail, tone = "neutral", comparison }: MetricCardProps) {
  return (
    <Card className={`p-4 ${toneStyles[tone]}`}>
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className={`break-words text-xl font-semibold tracking-tight sm:text-2xl ${valueToneStyles[tone]}`}>
          {value}
        </p>
        {comparison ? (
          <p className={`text-xs font-medium ${comparisonToneStyles[comparison.tone]}`}>{comparison.text}</p>
        ) : null}
      </div>
      {detail ? <p className="mt-2 break-words text-xs text-muted">{detail}</p> : null}
    </Card>
  );
}

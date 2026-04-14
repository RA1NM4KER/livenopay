import { Card, CardHeader } from "@/components/ui/card";
import type { InsightsProps } from "./types";

const toneClass = {
  neutral: "bg-canvas",
  good: "bg-accentSoft",
  watch: "bg-amberSoft"
};

export function Insights({ insights }: InsightsProps) {
  return (
    <Card>
      <CardHeader title="Signals" eyebrow="Insights" />
      <div className="snap-rail flex snap-x gap-3 overflow-x-auto p-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <article
            className={`min-w-[16rem] snap-start rounded-lg border border-line p-4 md:min-w-0 ${toneClass[insight.tone ?? "neutral"]}`}
            key={insight.title}
          >
            <h3 className="text-sm font-semibold text-ink">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{insight.body}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

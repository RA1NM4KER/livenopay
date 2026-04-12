import { Card, CardHeader } from "@/components/ui/card";
import type { Insight } from "@/lib/types";

const toneClass = {
  neutral: "bg-canvas",
  good: "bg-accentSoft",
  watch: "bg-amberSoft"
};

export function Insights({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader title="Signals" eyebrow="Insights" />
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <article className={`rounded-lg border border-line p-4 ${toneClass[insight.tone ?? "neutral"]}`} key={insight.title}>
            <h3 className="text-sm font-semibold text-ink">{insight.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{insight.body}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

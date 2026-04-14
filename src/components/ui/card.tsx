import type { CardHeaderProps, CardProps } from "./types";

export function Card({ children, className = "" }: CardProps) {
  return <section className={`min-w-0 rounded-lg border border-line bg-paper/88 ${className}`}>{children}</section>;
}

export function CardHeader({ title, eyebrow, action }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{eyebrow}</p> : null}
        <h2 className="mt-1 text-base font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

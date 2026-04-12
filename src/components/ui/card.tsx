import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <section className={`rounded-lg border border-line bg-paper/88 shadow-soft ${className}`}>{children}</section>;
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{eyebrow}</p> : null}
        <h2 className="mt-1 text-base font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

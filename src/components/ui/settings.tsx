import type { ReactNode } from "react";

// Shared building blocks for the Settings surface: a labelled group (macOS/
// Linear-style -- section label sitting above a single rounded card), evenly
// ruled rows inside it, a leading icon tile, an identity avatar, and a switch.
// Everything reads from the app's own tokens so light/dark come for free.

type Tone = "default" | "accent" | "danger";

export function SettingsGroup({
  label,
  tone = "default",
  children
}: {
  label: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const labelColor = tone === "danger" ? "text-red-600 dark:text-red-400" : "text-muted";
  const borderColor = tone === "danger" ? "border-red-200 dark:border-red-900/60" : "border-line";

  return (
    <section>
      <p className={`mb-2.5 ml-1 text-xs font-semibold tracking-wide ${labelColor}`}>{label}</p>
      <div className={`overflow-hidden rounded-xl border ${borderColor} bg-paper shadow-soft`}>{children}</div>
    </section>
  );
}

export function SettingsRow({
  leading,
  title,
  description,
  control
}: {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-line px-4 py-4 first:border-t-0 sm:px-5">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{description}</p> : null}
      </div>
      {control ? <div className="ml-auto shrink-0 pl-2">{control}</div> : null}
    </div>
  );
}

const iconTileTones: Record<Tone, string> = {
  default: "bg-canvas text-ink/70 border border-line",
  accent: "bg-accentSoft text-success",
  danger: "bg-roseSoft text-red-600 dark:text-red-400"
};

export function IconTile({ tone = "default", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] ${iconTileTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper"
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  disabled = false,
  onChange,
  label
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[1.625rem] w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-55 ${
        checked ? "border-accent bg-accent" : "border-line bg-line"
      }`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-paper shadow-sm transition-all ${
          checked ? "left-[calc(100%-1.375rem)]" : "left-0.5"
        }`}
      />
    </button>
  );
}

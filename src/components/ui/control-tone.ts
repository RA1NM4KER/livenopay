// Shared trigger-button color treatment for the small popover controls (dropdowns,
// date pickers, sync/export buttons) so they can sit on either a light card
// (default) or a dark/colored bar (e.g. the teal filter bar) without each
// component re-deriving its own colors -- and without appending a caller's
// override classes after conflicting hardcoded ones, which is unreliable
// since Tailwind utilities share specificity (the browser breaks the tie by
// generated stylesheet order, not by source order).
export type ControlTone = "light" | "dark";

export function triggerToneClass(tone: ControlTone = "light") {
  return tone === "dark"
    ? "border-white/15 bg-white/10 text-white hover:bg-white/15 focus:border-white/40"
    : "border-line bg-paper text-ink hover:bg-canvas focus:border-accent";
}

export function triggerIconToneClass(tone: ControlTone = "light") {
  return tone === "dark" ? "text-white/70" : "text-muted";
}

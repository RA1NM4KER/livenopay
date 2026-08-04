export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  );
}

// Pure Tab/Shift+Tab wrap decision, kept separate from any DOM query so the
// boundary arithmetic -- the part most likely to silently regress with an
// off-by-one -- is unit-testable without a DOM environment. `activeIndex`
// is the focused element's position in the current focusable list, or -1
// when focus isn't on any of them (e.g. it escaped to the page behind the
// overlay). Returns the index that should receive focus, or -1 to mean
// "let the browser's default Tab behavior handle it" (true whenever focus
// is already trapped somewhere in the middle of the list).
export function resolveTrapFocusIndex(count: number, activeIndex: number, shiftKey: boolean): number {
  if (count === 0) return -1;

  if (shiftKey) {
    return activeIndex === 0 || activeIndex === -1 ? count - 1 : -1;
  }

  return activeIndex === count - 1 || activeIndex === -1 ? 0 : -1;
}

import { describe, expect, it } from "vitest";
import { resolveTrapFocusIndex } from "./focus-trap";

describe("resolveTrapFocusIndex", () => {
  it("wraps Tab forward from the last focusable element to the first", () => {
    expect(resolveTrapFocusIndex(5, 4, false)).toBe(0);
  });

  it("wraps Shift+Tab backward from the first focusable element to the last", () => {
    expect(resolveTrapFocusIndex(5, 0, true)).toBe(4);
  });

  it("leaves the browser's default Tab behavior alone in the middle of the list", () => {
    expect(resolveTrapFocusIndex(5, 2, false)).toBe(-1);
    expect(resolveTrapFocusIndex(5, 2, true)).toBe(-1);
  });

  it("pulls focus back into the dialog when it isn't on any tracked element", () => {
    // activeIndex -1 means focus escaped to something outside the trapped
    // list entirely -- the regression this guards against is Tab moving
    // into the hidden page behind the overlay.
    expect(resolveTrapFocusIndex(5, -1, false)).toBe(0);
    expect(resolveTrapFocusIndex(5, -1, true)).toBe(4);
  });

  it("does nothing sensible to focus when there is nothing focusable", () => {
    expect(resolveTrapFocusIndex(0, -1, false)).toBe(-1);
    expect(resolveTrapFocusIndex(0, -1, true)).toBe(-1);
  });

  it("wraps correctly for a single focusable element (both directions land back on it)", () => {
    expect(resolveTrapFocusIndex(1, 0, false)).toBe(0);
    expect(resolveTrapFocusIndex(1, 0, true)).toBe(0);
  });
});

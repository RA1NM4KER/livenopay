import { describe, expect, it } from "vitest";
import { buildDayIntervalsUrl, buildEnergyRowsUrl } from "@/lib/endpoints";

describe("buildDayIntervalsUrl", () => {
  it("appends the period date as a query param", () => {
    expect(buildDayIntervalsUrl("2026-07-25")).toBe("/api/day-intervals?periodDate=2026-07-25");
  });

  it("URL-encodes special characters in the date", () => {
    expect(buildDayIntervalsUrl("2026/07/25")).toBe("/api/day-intervals?periodDate=2026%2F07%2F25");
  });
});

describe("buildEnergyRowsUrl", () => {
  it("appends the given search params", () => {
    const params = new URLSearchParams({ page: "2", pageSize: "50" });
    expect(buildEnergyRowsUrl(params)).toBe("/api/energy-rows?page=2&pageSize=50");
  });

  it("produces a bare query string suffix for empty params", () => {
    expect(buildEnergyRowsUrl(new URLSearchParams())).toBe("/api/energy-rows?");
  });
});

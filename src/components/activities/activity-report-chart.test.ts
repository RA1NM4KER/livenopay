import { describe, expect, it } from "vitest";
import { formatActivityMetric } from "./activity-report-model";

describe("activity report metric formatting", () => {
  it("switches units with the selected metric", () => {
    expect(formatActivityMetric("electricityKwh", 2)).toContain("kWh");
    expect(formatActivityMetric("averageKw", 2)).toBe("2.00 kW");
    expect(formatActivityMetric("electricitySpend", 2)).toContain("R");
    expect(formatActivityMetric("waterKl", 2)).toContain("kL");
  });
});

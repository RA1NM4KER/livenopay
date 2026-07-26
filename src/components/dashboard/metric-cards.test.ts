import { describe, expect, it } from "vitest";
import { buildMetricCards } from "@/components/dashboard/metric-cards";
import type { Analytics } from "@/lib/types";

function metrics(overrides: Partial<Analytics["metrics"]>): Analytics["metrics"] {
  return {
    totalSpend: 100,
    totalEnergySpend: 90,
    totalWaterSpend: 0,
    totalFixedSpend: 10,
    totalKwh: 40,
    totalWaterKl: 0,
    energyCostPerKwh: 2.25,
    allInCostPerKwh: 2.5,
    averageSpendPerDay: 50,
    averageKwhPerDay: 20,
    averageWaterKlPerDay: 0,
    dayCount: 2,
    ...overrides
  };
}

describe("buildMetricCards", () => {
  it("shows n/a for latest balance when it's not a number", () => {
    const cards = buildMetricCards(metrics({ latestBalance: undefined }));
    const balanceCard = cards.find((card) => card.label === "Latest balance");
    expect(balanceCard?.value).toBe("n/a");
    expect(balanceCard?.tone).toBe("neutral");
  });

  it("tones the balance card danger below 300, watch below 700, good at 700+", () => {
    expect(buildMetricCards(metrics({ latestBalance: 100 })).find((c) => c.label === "Latest balance")?.tone).toBe(
      "danger"
    );
    expect(buildMetricCards(metrics({ latestBalance: 500 })).find((c) => c.label === "Latest balance")?.tone).toBe(
      "watch"
    );
    expect(buildMetricCards(metrics({ latestBalance: 700 })).find((c) => c.label === "Latest balance")?.tone).toBe(
      "good"
    );
    expect(buildMetricCards(metrics({ latestBalance: 299.99 })).find((c) => c.label === "Latest balance")?.tone).toBe(
      "danger"
    );
  });

  it("omits water spend/usage cards when there's no water activity", () => {
    const cards = buildMetricCards(metrics({}));
    expect(cards.some((card) => card.label === "Water spend")).toBe(false);
    expect(cards.some((card) => card.label === "Water usage")).toBe(false);
  });

  it("inserts water spend/usage cards right after total usage when water is present", () => {
    const cards = buildMetricCards(metrics({ totalWaterSpend: 20, totalWaterKl: 5 }));
    const labels = cards.map((card) => card.label);
    expect(labels).toContain("Water spend");
    expect(labels).toContain("Water usage");
    expect(labels.indexOf("Water spend")).toBe(labels.indexOf("Total usage") + 1);
  });

  it("shows a comparison badge with an up arrow when spend increased", () => {
    const cards = buildMetricCards(metrics({ totalSpend: 150 }), metrics({ totalSpend: 100 }));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison?.text).toBe("↑ 50%");
  });

  it("shows a down arrow when spend decreased", () => {
    const cards = buildMetricCards(metrics({ totalSpend: 50 }), metrics({ totalSpend: 100 }));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison?.text).toBe("↓ 50%");
  });

  it("tones a spend increase as unfavorable (danger/watch), since higher spend is worse", () => {
    // Total spend uses higherIsBetter=false, so an increase should never be "good".
    const cards = buildMetricCards(metrics({ totalSpend: 150 }), metrics({ totalSpend: 100 }));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison?.tone).not.toBe("good");
  });

  it("tones a spend decrease as favorable (good)", () => {
    const cards = buildMetricCards(metrics({ totalSpend: 50 }), metrics({ totalSpend: 100 }));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison?.tone).toBe("good");
  });

  it("omits the comparison badge entirely when there's no previous period", () => {
    const cards = buildMetricCards(metrics({}));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison).toBeUndefined();
  });

  it("omits the comparison badge when there's no change", () => {
    const cards = buildMetricCards(metrics({ totalSpend: 100 }), metrics({ totalSpend: 100 }));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison).toBeUndefined();
  });

  it("omits the comparison badge when the previous value was zero (percentChange is undefined-safe)", () => {
    const cards = buildMetricCards(metrics({ totalSpend: 100 }), metrics({ totalSpend: 0 }));
    const spendCard = cards.find((card) => card.label === "Total spend");
    expect(spendCard?.comparison).toBeUndefined();
  });

  it("shows n/a for highest spend/usage day when there is none", () => {
    const cards = buildMetricCards(metrics({ highestSpendDay: undefined, highestUsageDay: undefined }));
    expect(cards.find((c) => c.label === "Highest spend day")?.value).toBe("n/a");
    expect(cards.find((c) => c.label === "Highest usage day")?.value).toBe("n/a");
  });
});

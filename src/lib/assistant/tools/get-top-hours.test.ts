import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow, hourlyRow } from "@/lib/assistant/test-fixtures";
import { getTopHoursTool } from "./get-top-hours";

const daily = [dailyRow({ periodDate: "2026-07-01" })];
const hourly = [
  hourlyRow({ periodDate: "2026-07-01", hour: 8, spend: 10, kwh: 2 }),
  hourlyRow({ periodDate: "2026-07-01", hour: 18, spend: 30, kwh: 8 })
];

describe("getTopHoursTool", () => {
  it("defaults to ranking by spend", async () => {
    const context = buildTestContext(daily, hourly);
    const result = (await getTopHoursTool.handler({}, async () => context)) as {
      metric: string;
      rows: Array<{ hour: string }>;
    };

    expect(result.metric).toBe("spend");
    expect(result.rows[0].hour).toBe("18:00");
  });

  it("ranks by kwh when requested", async () => {
    const context = buildTestContext(daily, hourly);
    const result = (await getTopHoursTool.handler({ metric: "kwh" }, async () => context)) as {
      rows: Array<{ hour: string }>;
    };

    expect(result.rows[0].hour).toBe("18:00");
  });

  it("falls back to spend for an unrecognized metric", async () => {
    const context = buildTestContext(daily, hourly);
    const result = (await getTopHoursTool.handler({ metric: "bogus" }, async () => context)) as { metric: string };
    expect(result.metric).toBe("spend");
  });

  it("clamps the limit between 1 and 10", async () => {
    const context = buildTestContext(daily, hourly);
    const result = (await getTopHoursTool.handler({ limit: 1 }, async () => context)) as { rows: unknown[] };
    expect(result.rows).toHaveLength(1);
  });
});

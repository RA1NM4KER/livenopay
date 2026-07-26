import { describe, expect, it } from "vitest";
import { dataTableQueryParamKeys, parseDataTableQuery } from "@/lib/data-table-query-params";

function paramsFrom(entries: Record<string, string>) {
  return new URLSearchParams(entries);
}

describe("parseDataTableQuery", () => {
  it("applies sensible defaults when nothing is set", () => {
    const result = parseDataTableQuery(paramsFrom({}));
    expect(result).toEqual({
      from: "",
      to: "",
      chargeType: "all",
      search: "",
      sortKey: "captured",
      sortDirection: "desc",
      page: 1,
      pageSize: 50
    });
  });

  it("passes through valid values", () => {
    const result = parseDataTableQuery(
      paramsFrom({
        [dataTableQueryParamKeys.chargeType]: "energy",
        [dataTableQueryParamKeys.search]: "top up",
        [dataTableQueryParamKeys.sort]: "amount",
        [dataTableQueryParamKeys.direction]: "asc",
        [dataTableQueryParamKeys.page]: "3",
        [dataTableQueryParamKeys.pageSize]: "100"
      })
    );

    expect(result.chargeType).toBe("energy");
    expect(result.search).toBe("top up");
    expect(result.sortKey).toBe("amount");
    expect(result.sortDirection).toBe("asc");
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(100);
  });

  it("falls back to 'all' for an unrecognized charge type", () => {
    const result = parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.chargeType]: "bogus" }));
    expect(result.chargeType).toBe("all");
  });

  it("falls back to page 1 for a non-positive page", () => {
    expect(parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.page]: "0" })).page).toBe(1);
    expect(parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.page]: "-5" })).page).toBe(1);
  });

  it("falls back to page 1 for a non-numeric page", () => {
    expect(parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.page]: "abc" })).page).toBe(1);
  });

  it("falls back to 50 for a pageSize outside the allowed set", () => {
    expect(parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.pageSize]: "10" })).pageSize).toBe(50);
    expect(parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.pageSize]: "1000" })).pageSize).toBe(50);
  });

  it("trims whitespace-only search down to an empty string", () => {
    expect(parseDataTableQuery(paramsFrom({ [dataTableQueryParamKeys.search]: "   " })).search).toBe("");
  });

  it("carries the date range through from parseDateRangeQuery", () => {
    const result = parseDataTableQuery(paramsFrom({ from: "2026-01-01", to: "2026-01-31" }));
    expect(result.from).toBe("2026-01-01");
    expect(result.to).toBe("2026-01-31");
  });
});

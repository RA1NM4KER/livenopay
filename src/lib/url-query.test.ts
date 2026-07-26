import { describe, expect, it } from "vitest";
import { applyQueryUpdates, queryHref } from "@/lib/url-query";

describe("applyQueryUpdates", () => {
  it("sets a new param", () => {
    const result = applyQueryUpdates(new URLSearchParams(""), { from: "2026-01-01" });
    expect(result.get("from")).toBe("2026-01-01");
  });

  it("overwrites an existing param", () => {
    const result = applyQueryUpdates(new URLSearchParams("from=2026-01-01"), { from: "2026-02-01" });
    expect(result.get("from")).toBe("2026-02-01");
  });

  it("deletes a param when the update value is null", () => {
    const result = applyQueryUpdates(new URLSearchParams("from=2026-01-01&to=2026-02-01"), { from: null });
    expect(result.has("from")).toBe(false);
    expect(result.get("to")).toBe("2026-02-01");
  });

  it("deletes a param when the update value is an empty string", () => {
    const result = applyQueryUpdates(new URLSearchParams("search=abc"), { search: "" });
    expect(result.has("search")).toBe(false);
  });

  it("deletes a param when the update value is undefined", () => {
    const result = applyQueryUpdates(new URLSearchParams("search=abc"), { search: undefined });
    expect(result.has("search")).toBe(false);
  });

  it("leaves unrelated params untouched", () => {
    const result = applyQueryUpdates(new URLSearchParams("page=2"), { search: "abc" });
    expect(result.get("page")).toBe("2");
    expect(result.get("search")).toBe("abc");
  });
});

describe("queryHref", () => {
  it("returns the bare pathname when there are no params", () => {
    expect(queryHref("/data", new URLSearchParams())).toBe("/data");
  });

  it("appends a query string when params are present", () => {
    expect(queryHref("/data", new URLSearchParams("page=2"))).toBe("/data?page=2");
  });
});

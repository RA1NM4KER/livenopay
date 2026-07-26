import { describe, expect, it } from "vitest";
import { getRateLimitIdentifier, rateLimitHeaders } from "@/lib/rate-limit";

describe("getRateLimitIdentifier", () => {
  it("uses the user id alone when there's no scope", () => {
    expect(getRateLimitIdentifier("user-123")).toBe("user-123");
  });

  it("appends the scope when given, so different features get independent buckets", () => {
    expect(getRateLimitIdentifier("user-123", "assistant")).toBe("user-123:assistant");
  });

  it("never falls back to an IP-derived identifier -- always keys off the passed user id", () => {
    // Regression guard for the specific fix this module went through: rate
    // limiting must be per authenticated user, not per IP (IP either
    // double-counts users on the same network, or lets one user dodge their
    // own limit by switching networks).
    const identifier = getRateLimitIdentifier("user-abc", "default");
    expect(identifier).not.toContain("127.0.0.1");
    expect(identifier.startsWith("user-abc")).toBe(true);
  });
});

describe("rateLimitHeaders", () => {
  it("maps the result onto the expected X-RateLimit-* header names", () => {
    const headers = rateLimitHeaders({
      allowed: true,
      minute: { success: true, limit: 5, remaining: 3, reset: 1000 },
      day: { success: true, limit: 30, remaining: 20, reset: 2000 }
    });

    expect(headers).toEqual({
      "X-RateLimit-Limit-Minute": "5",
      "X-RateLimit-Remaining-Minute": "3",
      "X-RateLimit-Reset-Minute": "1000",
      "X-RateLimit-Limit-Day": "30",
      "X-RateLimit-Remaining-Day": "20",
      "X-RateLimit-Reset-Day": "2000"
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { logLiveError, redact } from "@/lib/live-log";

describe("redact", () => {
  it("strips bearer tokens", () => {
    expect(redact("Authorization: Bearer nm_dev_AbC123.def-456")).toBe("Authorization: Bearer <redacted>");
  });

  it("strips nm_dev_ device keys anywhere", () => {
    expect(redact("key nm_dev_SuperSecretValue123 used")).toBe("key nm_dev_<redacted> used");
  });

  it("strips api_key_hash query values (the device-auth lookup URL)", () => {
    const msg =
      "GET /meter_devices?select=id&api_key_hash=eq.9f8e7d6c5b4a3928176554433221100ffeeddccbbaa99887766554433221100 failed (500)";
    const out = redact(msg);
    expect(out).not.toContain("9f8e7d6c5b4a");
    expect(out).toContain("api_key_hash=<redacted>");
  });

  it("strips long hex digests (sha256)", () => {
    const hash = "a".repeat(64);
    expect(redact(`hash=${hash}`)).not.toContain(hash);
  });

  it("leaves non-secret text intact", () => {
    expect(redact("device 7b8ee585 accepted=5 duplicates=1")).toBe("device 7b8ee585 accepted=5 duplicates=1");
  });
});

describe("logLiveError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits one JSON line with the category and redacted message, never a raw secret", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logLiveError("live_ingest_auth_error", new Error("Bearer nm_dev_leakme failed"), { reqId: "abcd1234" });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.evt).toBe("live_ingest_auth_error");
    expect(parsed.reqId).toBe("abcd1234");
    expect(line).not.toContain("nm_dev_leakme");
    expect(parsed.error).toContain("<redacted>");
  });

  it("redacts secrets embedded in structured string fields too", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logLiveError("live_ingest_error", "boom", { detail: "token nm_dev_xyz" });
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain("nm_dev_xyz");
  });
});

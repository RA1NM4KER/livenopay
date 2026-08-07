import { describe, expect, it } from "vitest";
import {
  DEVICE_KEY_PREFIX,
  deviceKeyHint,
  generateDeviceKey,
  hashDeviceKey,
  parseBearerDeviceKey
} from "@/lib/meter-device-keys";

describe("generateDeviceKey", () => {
  it("has the nm_dev_ prefix and high-entropy base64url body", () => {
    const key = generateDeviceKey();
    expect(key.startsWith(DEVICE_KEY_PREFIX)).toBe(true);

    const body = key.slice(DEVICE_KEY_PREFIX.length);
    // 32 random bytes -> 43 base64url chars (no padding), all URL-safe.
    expect(body).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("produces a distinct key every call", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateDeviceKey()));
    expect(keys.size).toBe(100);
  });
});

describe("hashDeviceKey", () => {
  it("is deterministic for the same key", () => {
    const key = generateDeviceKey();
    expect(hashDeviceKey(key)).toBe(hashDeviceKey(key));
  });

  it("produces a 64-char hex sha256 digest", () => {
    expect(hashDeviceKey("nm_dev_example")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("maps different keys to different hashes", () => {
    expect(hashDeviceKey(generateDeviceKey())).not.toBe(hashDeviceKey(generateDeviceKey()));
  });

  it("never returns the raw key -- only a derived digest", () => {
    const key = generateDeviceKey();
    const hash = hashDeviceKey(key);
    expect(hash).not.toContain(key);
    expect(hash).not.toContain(DEVICE_KEY_PREFIX);
  });
});

describe("deviceKeyHint", () => {
  it("is only the last few characters, never the whole key", () => {
    const key = generateDeviceKey();
    const hint = deviceKeyHint(key);
    expect(hint.length).toBeLessThan(key.length);
    expect(key.endsWith(hint)).toBe(true);
  });
});

describe("parseBearerDeviceKey", () => {
  it("extracts a valid bearer device key", () => {
    const key = generateDeviceKey();
    expect(parseBearerDeviceKey(`Bearer ${key}`)).toBe(key);
  });

  it("returns null for a missing header", () => {
    expect(parseBearerDeviceKey(null)).toBeNull();
    expect(parseBearerDeviceKey(undefined)).toBeNull();
    expect(parseBearerDeviceKey("")).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(parseBearerDeviceKey(`Basic ${generateDeviceKey()}`)).toBeNull();
    expect(parseBearerDeviceKey(generateDeviceKey())).toBeNull();
  });

  it("returns null when the token lacks the device-key prefix", () => {
    expect(parseBearerDeviceKey("Bearer some-random-token")).toBeNull();
    expect(parseBearerDeviceKey(`Bearer ${DEVICE_KEY_PREFIX}`)).toBeNull();
  });
});

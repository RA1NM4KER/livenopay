import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { decryptRefreshToken, encryptRefreshToken } from "@/lib/token-encryption";

beforeEach(() => {
  // A valid AES-256 key must decode to exactly 32 bytes.
  process.env.LIVENOPAY_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("encryptRefreshToken / decryptRefreshToken", () => {
  it("round-trips a token through encryption and decryption", () => {
    const original = "super-secret-refresh-token";
    const encrypted = encryptRefreshToken(original);
    expect(decryptRefreshToken(encrypted)).toBe(original);
  });

  it("round-trips an empty string", () => {
    const encrypted = encryptRefreshToken("");
    expect(decryptRefreshToken(encrypted)).toBe("");
  });

  it("round-trips unicode content", () => {
    const original = "token-with-emoji-🔒-and-áccents";
    const encrypted = encryptRefreshToken(original);
    expect(decryptRefreshToken(encrypted)).toBe(original);
  });

  it("produces a different iv (and ciphertext) on every call, even for the same input", () => {
    const first = encryptRefreshToken("same-input");
    const second = encryptRefreshToken("same-input");
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("throws instead of silently returning garbage when the ciphertext is tampered with", () => {
    const encrypted = encryptRefreshToken("original-token");
    const tamperedBuffer = Buffer.from(encrypted.ciphertext, "base64");
    tamperedBuffer[0] ^= 0xff;

    expect(() => decryptRefreshToken({ ...encrypted, ciphertext: tamperedBuffer.toString("base64") })).toThrow();
  });

  it("throws when the auth tag is tampered with", () => {
    const encrypted = encryptRefreshToken("original-token");
    const tamperedTag = Buffer.from(encrypted.authTag, "base64");
    tamperedTag[0] ^= 0xff;

    expect(() => decryptRefreshToken({ ...encrypted, authTag: tamperedTag.toString("base64") })).toThrow();
  });

  it("throws when decrypting with the wrong key", () => {
    const encrypted = encryptRefreshToken("original-token");
    process.env.LIVENOPAY_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

    expect(() => decryptRefreshToken(encrypted)).toThrow();
  });
});

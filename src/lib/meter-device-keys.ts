import "server-only";

import { createHash, randomBytes } from "node:crypto";

// Raw device keys look like `nm_dev_<base64url(32 random bytes)>`. The prefix
// is a human-facing label only (so a leaked key is recognisable in logs/config
// and can be grepped for); all of the security comes from the 32 bytes = 256
// bits of entropy after it.
export const DEVICE_KEY_PREFIX = "nm_dev_";
const DEVICE_KEY_ENTROPY_BYTES = 32;
const KEY_HINT_LENGTH = 6;

// Generates a fresh device key. The raw value is returned to the caller to be
// shown exactly once (at device creation) and never stored -- only its hash
// goes to the database.
export function generateDeviceKey(): string {
  return `${DEVICE_KEY_PREFIX}${randomBytes(DEVICE_KEY_ENTROPY_BYTES).toString("base64url")}`;
}

// SHA-256 is deliberate (not bcrypt/argon2): the input is a high-entropy random
// token, not a low-entropy human password, so there is nothing to brute-force
// and a slow hash would only add latency to every ingestion request.
export function hashDeviceKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

// A harmless label for identifying a device in a list (last few characters of
// the raw key). Never enough to reconstruct or guess the key.
export function deviceKeyHint(rawKey: string): string {
  return rawKey.slice(-KEY_HINT_LENGTH);
}

// Extracts the raw key from an `Authorization: Bearer <key>` header. Returns
// null for a missing header, the wrong scheme, or an empty/blatantly malformed
// token -- callers turn any null into the same generic 401 so unknown vs.
// malformed vs. disabled are indistinguishable to an attacker.
export function parseBearerDeviceKey(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = /^Bearer[ ]+(.+)$/.exec(authorizationHeader.trim());
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  if (!token.startsWith(DEVICE_KEY_PREFIX) || token.length <= DEVICE_KEY_PREFIX.length) {
    return null;
  }

  return token;
}

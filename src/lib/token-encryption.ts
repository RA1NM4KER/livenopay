import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getTokenEncryptionKey } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export type EncryptedToken = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptRefreshToken(refreshToken: string): EncryptedToken {
  const key = getTokenEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptRefreshToken(encrypted: EncryptedToken): string {
  const key = getTokenEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

  const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, "base64")), decipher.final()]);

  return plaintext.toString("utf8");
}

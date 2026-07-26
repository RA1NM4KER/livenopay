import "server-only";

function required(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length) {
      return value;
    }
  }

  throw new Error(`MISSING_ENV: one of ${names.join(", ")} must be set in the environment.`);
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length ? value : fallback;
}

export function getSupabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey() {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

export function getTokenEncryptionKey(): Buffer {
  const raw = required("LIVENOPAY_TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("LIVENOPAY_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded AES-256 key).");
  }

  return key;
}

export function getLivenopayFirebaseApiKey() {
  return required("LIVENOPAY_FIREBASE_API_KEY");
}

export function getLivenopayWebBaseUrl() {
  return optional("LIVENOPAY_WEB_BASE_URL", "https://app.propertywallet.co.za");
}

export function getLivenopayWebPortalOrigin() {
  return optional("LIVENOPAY_WEB_PORTAL_ORIGIN", "https://app.livewalletportal.co.za");
}

export function getLivenopayWebAppFlavor() {
  return optional("LIVENOPAY_WEB_APP_FLAVOR", "livemopay");
}

export function getOpenAiApiKey(): string | undefined {
  const value = process.env.OPENAI_API_KEY;
  return value && value.length ? value : undefined;
}

export function getOpenAiModel() {
  return optional("OPENAI_MODEL", "gpt-4.1-mini");
}

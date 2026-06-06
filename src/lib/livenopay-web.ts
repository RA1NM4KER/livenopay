import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ENERGY_LABEL_RE = /^(.+?) \((\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)$/;
const WATER_LABEL_RE = /^(Water:.+?) \((\d{4}-\d{2}-\d{2} \d{2}:\d{2}) to \d{4}-\d{2}-\d{2} \d{2}:\d{2}\)$/;
const FIXED_LABEL_RE = /^(Daily .+?) - (\d{4}-\d{2}-\d{2})$/;
const ENERGY_UNITS_RE = /(-?[\d.]+)\s*kWh\s*@\s*R(-?[\d.]+)/;
const WATER_UNITS_RE = /(-?[\d.]+)\s*kL\s*@\s*R(-?[\d.]+)/;
const FIXED_UNITS_RE = /(-?[\d.]+)\s*@\s*R(-?[\d.]+)/;

export const livenopayFieldNames = [
  "capture_dt",
  "source_ts",
  "charge_label",
  "period_dt",
  "kwh",
  "water_kl",
  "tariff",
  "cost",
  "balance"
] as const;

export type LivenopayFieldName = (typeof livenopayFieldNames)[number];

export type LivenopayCsvRow = Record<LivenopayFieldName, string>;

type AuthSession = {
  id_token: string;
  refresh_token: string;
  expires_at: string;
  email?: string;
  local_id?: string;
};

type LedgerApiRow = {
  balance?: string | null;
  balanceIncl?: string | null;
  credit?: string | null;
  creditIncl?: string | null;
  date: string;
  debit?: string | null;
  debitIncl?: string | null;
  description?: string | null;
  id?: string | number | null;
  unitsDescription?: string | null;
  unitsDescriptionIncl?: string | null;
};

function defaultStateRoot() {
  if (process.env.LIVENOPAY_STATE_DIR) {
    return process.env.LIVENOPAY_STATE_DIR;
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "livenopay");
  }

  return process.cwd();
}

function envPath(name: string, fallback: string) {
  const configured = process.env[name];
  const root = defaultStateRoot();
  return path.isAbsolute(configured || "") ? configured! : path.join(root, configured || fallback);
}

function envString(name: string, fallback?: string) {
  const value = process.env[name];
  return value && value.length ? value : fallback;
}

function requireEnv(name: string) {
  const value = envString(name);
  if (!value) {
    throw new Error(`MISSING_ENV: ${name} must be set in the environment.`);
  }

  return value;
}

const sessionPath = envPath("LIVENOPAY_WEB_SESSION_PATH", ".secrets/livemopay_auth.json");
const csvPath = envPath("LIVENOPAY_CSV_PATH", "livemopay_energy.csv");
const localTimeZone = envString("LIVENOPAY_TIMEZONE", "Africa/Johannesburg")!;
const portalOrigin = envString("LIVENOPAY_WEB_PORTAL_ORIGIN", "https://app.livewalletportal.co.za")!;
const apiBaseUrl = envString("LIVENOPAY_WEB_BASE_URL", "https://app.propertywallet.co.za")!;
const authHeaderName = envString("LIVENOPAY_WEB_AUTH_HEADER", "Authorization")!;
const authScheme = envString("LIVENOPAY_WEB_AUTH_SCHEME", "Bearer")!;
const refreshBufferSeconds = Number(envString("LIVENOPAY_WEB_REFRESH_BUFFER_SECONDS", "300"));
const acceptLanguage = envString("LIVENOPAY_WEB_ACCEPT_LANGUAGE", "en-US,en;q=0.9")!;
const appFlavor = envString("LIVENOPAY_WEB_APP_FLAVOR", "livemopay")!;
const userAgent =
  envString("LIVENOPAY_WEB_USER_AGENT") ||
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "AppleWebKit/537.36 (KHTML, like Gecko)",
    "Chrome/136.0.0.0 Safari/537.36"
  ].join(" ");

const localDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: localTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const localYearFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: localTimeZone,
  year: "numeric"
});

function formatLocalCaptureDate(value: string) {
  const parts = localDateFormatter.formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!day || !month || !year || !hour || !minute) {
    throw new Error(`Could not format capture timestamp ${value}.`);
  }

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function captureDateToPeriodDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid capture_dt ${value}.`);
  }

  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseMoney(value: string | null | undefined) {
  return (value || "").trim().replaceAll("R", "").replaceAll(",", "") || "0";
}

function normalizeNumericString(value: string, scale: number) {
  const trimmed = value.trim();
  if (!trimmed) {
    return (0).toFixed(scale);
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return trimmed;
  }

  return numeric.toFixed(scale);
}

export function livenopayLedgerKey(row: Pick<LivenopayCsvRow, "charge_label" | "period_dt" | "cost" | "balance">) {
  return [
    row.charge_label.trim(),
    row.period_dt.trim(),
    normalizeNumericString(row.cost, 2),
    normalizeNumericString(row.balance, 2)
  ].join("|");
}

async function ensureSessionDir() {
  await mkdir(path.dirname(sessionPath), { recursive: true });
}

async function loadSession(): Promise<AuthSession | null> {
  try {
    const raw = await readFile(sessionPath, "utf8");
    return JSON.parse(raw) as AuthSession;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function saveSession(session: AuthSession) {
  await ensureSessionDir();
  await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

async function readJsonResponse<T>(response: Response, context: string) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}: ${text}`);
  }

  return (text ? JSON.parse(text) : null) as T;
}

async function postJson<T>(url: string, payload: unknown, headers?: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  return readJsonResponse<T>(response, `POST ${url}`);
}

async function postForm<T>(url: string, payload: Record<string, string>, headers?: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(headers ?? {})
    },
    body: new URLSearchParams(payload).toString(),
    cache: "no-store"
  });

  return readJsonResponse<T>(response, `POST ${url}`);
}

async function getJson<T>(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  return readJsonResponse<T>(response, `GET ${url}`);
}

function expiresAtFromSeconds(expiresIn: string | number) {
  return new Date(Date.now() + Number(expiresIn) * 1000).toISOString();
}

function firebaseResponseToSession(
  response: { idToken: string; refreshToken: string; expiresIn: string; email?: string; localId?: string },
  email?: string
): AuthSession {
  return {
    id_token: response.idToken,
    refresh_token: response.refreshToken,
    expires_at: expiresAtFromSeconds(response.expiresIn),
    email: email || response.email,
    local_id: response.localId
  };
}

async function firebaseLogin() {
  const apiKey = requireEnv("LIVENOPAY_FIREBASE_API_KEY");
  const email = requireEnv("LIVENOPAY_WEB_EMAIL");
  const password = requireEnv("LIVENOPAY_WEB_PASSWORD");
  const response = await postJson<{
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    email?: string;
    localId?: string;
  }>(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    email,
    password,
    returnSecureToken: true
  });
  const session = firebaseResponseToSession(response, email);
  await saveSession(session);
  return session;
}

async function firebaseRefresh(refreshToken: string, email?: string) {
  const apiKey = requireEnv("LIVENOPAY_FIREBASE_API_KEY");
  const response = await postForm<{
    id_token: string;
    refresh_token: string;
    expires_in: string;
    user_id?: string;
  }>(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const session: AuthSession = {
    id_token: response.id_token,
    refresh_token: response.refresh_token,
    expires_at: expiresAtFromSeconds(response.expires_in),
    email,
    local_id: response.user_id
  };
  await saveSession(session);
  return session;
}

function isExpiringSoon(session: AuthSession) {
  return Date.now() + refreshBufferSeconds * 1000 >= new Date(session.expires_at).getTime();
}

async function ensureValidSession() {
  const session = await loadSession();

  if (!session) {
    return firebaseLogin();
  }

  if (isExpiringSoon(session)) {
    return firebaseRefresh(session.refresh_token, session.email);
  }

  return session;
}

function decodeJwtClaims(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT: expected at least two segments.");
  }

  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
}

function authHeaders(session: AuthSession) {
  const claims = decodeJwtClaims(session.id_token);
  const accountId = requireEnv("LIVENOPAY_ACCOUNT_ID");
  const companyId = String(envString("LIVENOPAY_COMPANY_ID") || claims.company_id || "");
  const propertyId = String(envString("LIVENOPAY_PROPERTY_ID") || claims.property_id || "");

  if (!companyId || !propertyId) {
    throw new Error("Missing LIVENOPAY_COMPANY_ID or LIVENOPAY_PROPERTY_ID and JWT claims did not provide them.");
  }

  return {
    [authHeaderName]: `${authScheme} ${session.id_token}`.trim(),
    Accept: "*/*",
    "Accept-Language": acceptLanguage,
    accountid: accountId,
    appflavor: appFlavor,
    companyid: companyId,
    Origin: portalOrigin,
    propertyid: propertyId,
    Referer: `${portalOrigin.replace(/\/$/, "")}/`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": userAgent
  };
}

async function discoverAccountId(session: AuthSession) {
  const payload = await getJson<Array<Record<string, unknown>> | Record<string, unknown>>(
    `${apiBaseUrl.replace(/\/$/, "")}/mobile/`,
    authHeaders(session)
  );

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const accountId = item.accountId ?? item.id;
      if (accountId !== undefined && accountId !== null) {
        return String(accountId);
      }
    }
  }

  throw new Error("Could not discover account id from /mobile/. Set LIVENOPAY_ACCOUNT_ID in the environment.");
}

function normalizeLedgerRow(item: LedgerApiRow): LivenopayCsvRow | null {
  const description = (item.description || "").trim();
  const captureDt = formatLocalCaptureDate(item.date);
  const balance = parseMoney(item.balanceIncl || item.balance);

  const energyMatch = description.match(ENERGY_LABEL_RE);
  if (energyMatch) {
    const units = item.unitsDescriptionIncl || item.unitsDescription || "";
    const unitsMatch = units.match(ENERGY_UNITS_RE);
    if (!unitsMatch) {
      throw new Error(`Could not parse energy units from ${JSON.stringify(units)}.`);
    }

    return {
      capture_dt: captureDt,
      source_ts: item.date,
      charge_label: energyMatch[1],
      period_dt: energyMatch[2],
      kwh: unitsMatch[1],
      water_kl: "0",
      tariff: unitsMatch[2],
      cost: parseMoney(item.debitIncl || item.debit),
      balance
    };
  }

  const waterMatch = description.match(WATER_LABEL_RE);
  if (waterMatch) {
    const units = item.unitsDescriptionIncl || item.unitsDescription || "";
    const unitsMatch = units.match(WATER_UNITS_RE);
    if (!unitsMatch) {
      throw new Error(`Could not parse water units from ${JSON.stringify(units)}.`);
    }

    return {
      capture_dt: captureDt,
      source_ts: item.date,
      charge_label: waterMatch[1],
      period_dt: waterMatch[2],
      kwh: "0",
      water_kl: unitsMatch[1],
      tariff: unitsMatch[2],
      cost: parseMoney(item.debitIncl || item.debit),
      balance
    };
  }

  const fixedMatch = description.match(FIXED_LABEL_RE);
  if (fixedMatch) {
    const units = item.unitsDescriptionIncl || item.unitsDescription || "";
    const unitsMatch = units.match(FIXED_UNITS_RE);
    if (!unitsMatch) {
      throw new Error(`Could not parse fixed-charge units from ${JSON.stringify(units)}.`);
    }

    return {
      capture_dt: captureDt,
      source_ts: item.date,
      charge_label: fixedMatch[1],
      period_dt: `${fixedMatch[2]} 00:00`,
      kwh: "0",
      water_kl: "0",
      tariff: unitsMatch[2],
      cost: parseMoney(item.debitIncl || item.debit),
      balance
    };
  }

  const credit = parseMoney(item.creditIncl || item.credit);
  if (credit !== "0") {
    return {
      capture_dt: captureDt,
      source_ts: item.date,
      charge_label: "Top Up",
      period_dt: captureDateToPeriodDate(captureDt),
      kwh: "0",
      water_kl: "0",
      tariff: "0",
      cost: credit,
      balance
    };
  }

  return null;
}

export function dedupeLivenopayRows(rows: LivenopayCsvRow[]) {
  const seen = new Set<string>();
  const unique: LivenopayCsvRow[] = [];

  for (const row of rows) {
    const key = livenopayLedgerKey(row);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(row);
  }

  return unique;
}

export async function fetchLivenopayLedgerRows(startDate: string) {
  const session = await ensureValidSession();
  const accountId = envString("LIVENOPAY_ACCOUNT_ID") || (await discoverAccountId(session));
  const url =
    `${apiBaseUrl.replace(/\/$/, "")}/mobile/ledger/${encodeURIComponent(startDate)}` +
    `?accountId=${encodeURIComponent(accountId)}`;
  const payload = await getJson<unknown>(url, authHeaders(session));

  if (!Array.isArray(payload)) {
    throw new Error(`Expected a list from ledger endpoint, got ${typeof payload}.`);
  }

  const rows: LivenopayCsvRow[] = [];

  for (const item of payload) {
    const normalized = normalizeLedgerRow(item as LedgerApiRow);
    if (normalized) {
      rows.push(normalized);
    }
  }

  return dedupeLivenopayRows(rows);
}

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

export async function writeLivenopayCsv(rows: LivenopayCsvRow[], targetPath = csvPath) {
  await mkdir(path.dirname(targetPath), { recursive: true });

  const header = livenopayFieldNames.join(",");
  const lines = rows.map((row) => livenopayFieldNames.map((field) => escapeCsvValue(row[field] || "")).join(","));
  await writeFile(targetPath, `${[header, ...lines].join("\n")}\n`, "utf8");
}

export async function readLivenopayCsvRows(targetPath = csvPath) {
  let raw: string;

  try {
    raw = await readFile(targetPath, "utf8");
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      throw new Error(`${targetPath} does not exist. Run capture before syncing.`);
    }

    throw error;
  }

  const lines = raw.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length <= 1) {
    return [] as LivenopayCsvRow[];
  }

  const headers = parseCsvLine(lines[0]);
  const required = new Set(livenopayFieldNames.filter((field) => field !== "source_ts" && field !== "water_kl"));
  const seen = new Set<string>();
  const rows: LivenopayCsvRow[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) {
      continue;
    }

    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])) as Record<
      string,
      string
    >;

    if (Array.from(required).some((field) => !row[field])) {
      continue;
    }

    const normalized = Object.fromEntries(
      livenopayFieldNames.map((field) => [field, row[field] || (field === "water_kl" ? "0" : "")])
    ) as LivenopayCsvRow;
    const key = livenopayLedgerKey(normalized);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    rows.push(normalized);
  }

  return rows;
}

export async function latestLivenopayCsvStartDate(targetPath = csvPath) {
  try {
    const rows = await readLivenopayCsvRows(targetPath);
    let latestPeriod: string | null = null;

    for (const row of rows) {
      if (!latestPeriod || row.period_dt > latestPeriod) {
        latestPeriod = row.period_dt;
      }
    }

    return latestPeriod ? latestPeriod.split(" ", 1)[0] : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("does not exist")) {
      return null;
    }

    throw error;
  }
}

export function getLivenopayCsvPath() {
  return csvPath;
}

export function currentLivenopayLocalYear() {
  return localYearFormatter.format(new Date());
}

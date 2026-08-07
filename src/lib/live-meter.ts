import "server-only";

import {
  bucketWattsSeries,
  changeWattsLastMinute,
  energyKwh,
  estimateLoadWatts,
  isEstimateFresh,
  LIVE_WINDOWS,
  recentMedianIntervalMs
} from "./live-meter-calc";
import type { EstimateState, LiveOverview, LiveWindow } from "./live-meter-types";
import { adminSupabaseCount, adminSupabaseFetch } from "./supabase-rest";

// Cap the number of raw pulses pulled for the series query, so a very busy
// meter over a 6h window can't return an unbounded row set. The result is
// downsampled to ~180 points regardless; this only bounds the DB read.
const PULSE_QUERY_CAP = 20000;

// How many of the most-recent pulses to inspect for the hero estimate and
// cadence. Small: the hero is the median of the latest few valid intervals.
const HERO_LOOKBACK = 8;

type DeviceRow = { id: string; name: string; pulses_per_kwh: number };
type PulseRow = { observed_at: string; delta_ms: number | null };

// Every connection row this user has ever owned (an old disconnected row plus a
// reconnect both count), so a device attached to any of them resolves. Scoped
// strictly to the caller's user_id -- ownership is never taken from the client.
async function getUserConnectionIds(userId: string): Promise<string[]> {
  const rows = await adminSupabaseFetch<Array<{ id: string }>>(
    `/livemopay_connections?select=id&user_id=eq.${encodeURIComponent(userId)}`
  );
  return rows.map((row) => row.id);
}

// Device-selection rule: the most recently seen enabled device wins (last_seen_at
// desc, nulls last). The prototype has exactly one enabled reader; if more than
// one ever exists for a user, this deterministically picks the one that most
// recently reported pulses rather than blindly merging several devices' data.
// Only presentation fields are selected -- api_key_hash / key_hint never leave
// the server.
async function resolveLiveDevice(connectionIds: string[]): Promise<DeviceRow | null> {
  if (connectionIds.length === 0) {
    return null;
  }

  const inList = connectionIds.map((id) => encodeURIComponent(id)).join(",");
  const rows = await adminSupabaseFetch<DeviceRow[]>(
    `/meter_devices?select=id,name,pulses_per_kwh&connection_id=in.(${inList})` +
      `&enabled=eq.true&order=last_seen_at.desc.nullslast&limit=1`
  );
  return rows[0] ?? null;
}

function emptyOverview(window: LiveWindow, device: LiveOverview["device"], nowMs: number): LiveOverview {
  return {
    device,
    window,
    latest: {
      estimatedWatts: null,
      estimateState: "waiting",
      lastPulseAt: null,
      lastDeltaMs: null,
      changeWattsLastMinute: null
    },
    energy: { last5MinutesKwh: 0, lastHourKwh: 0 },
    series: [],
    generatedAt: new Date(nowMs).toISOString()
  };
}

// Presentation data for the Live page, derived entirely server-side from the
// caller's own device pulses. The browser never reads meter_pulses directly.
export async function loadLiveOverview(userId: string, window: LiveWindow): Promise<LiveOverview> {
  const nowMs = Date.now();

  const device = await resolveLiveDevice(await getUserConnectionIds(userId));
  if (!device) {
    return emptyOverview(window, null, nowMs);
  }

  const deviceInfo = { name: device.name, pulsesPerKwh: device.pulses_per_kwh };
  const deviceFilter = `device_id=eq.${encodeURIComponent(device.id)}`;
  // Snap the window start DOWN to a bucket boundary so the leftmost bucket is
  // whole and its epoch-aligned key is stable between refetches (the interior
  // buckets are already stable via epoch alignment).
  const bucketMs = LIVE_WINDOWS[window].bucketMs;
  const windowStartMs = Math.floor((nowMs - LIVE_WINDOWS[window].ms) / bucketMs) * bucketMs;
  const fiveMinAgo = new Date(nowMs - 5 * 60_000).toISOString();
  const oneHourAgo = new Date(nowMs - 60 * 60_000).toISOString();
  const windowStartIso = new Date(windowStartMs).toISOString();

  const [latestRows, seriesRows, count5m, count1h] = await Promise.all([
    adminSupabaseFetch<PulseRow[]>(
      `/meter_pulses?select=observed_at,delta_ms&${deviceFilter}&order=observed_at.desc&limit=${HERO_LOOKBACK}`
    ),
    adminSupabaseFetch<PulseRow[]>(
      `/meter_pulses?select=observed_at,delta_ms&${deviceFilter}` +
        `&observed_at=gte.${windowStartIso}&order=observed_at.asc&limit=${PULSE_QUERY_CAP}`
    ),
    adminSupabaseCount(`/meter_pulses?select=id&${deviceFilter}&observed_at=gte.${fiveMinAgo}`),
    adminSupabaseCount(`/meter_pulses?select=id&${deviceFilter}&observed_at=gte.${oneHourAgo}`)
  ]);

  // Hero: median of the latest few valid intervals (most-recent-first).
  const recentDeltas = latestRows.map((row) => row.delta_ms);
  const estimatedWatts = estimateLoadWatts(recentDeltas, deviceInfo.pulsesPerKwh);
  const lastPulseAt = latestRows[0]?.observed_at ?? null;
  const lastDeltaMs = latestRows[0]?.delta_ms ?? null;

  let estimateState: EstimateState;
  if (estimatedWatts === null || lastPulseAt === null) {
    // 0 or 1 pulse, or no valid interval -> not enough to estimate power yet.
    estimateState = "waiting";
  } else {
    const medianInterval = recentMedianIntervalMs(recentDeltas);
    estimateState = isEstimateFresh(Date.parse(lastPulseAt), nowMs, medianInterval) ? "fresh" : "stale";
  }

  const series = bucketWattsSeries(
    seriesRows.map((row) => ({ observedAt: row.observed_at, deltaMs: row.delta_ms })),
    deviceInfo.pulsesPerKwh,
    windowStartMs,
    nowMs,
    bucketMs
  );

  return {
    device: deviceInfo,
    window,
    latest: {
      estimatedWatts: estimatedWatts === null ? null : Math.round(estimatedWatts),
      estimateState,
      lastPulseAt,
      lastDeltaMs,
      changeWattsLastMinute:
        estimateState === "fresh"
          ? (() => {
              const change = changeWattsLastMinute(series, estimatedWatts, nowMs);
              return change === null ? null : Math.round(change);
            })()
          : null
    },
    energy: {
      last5MinutesKwh: energyKwh(count5m, deviceInfo.pulsesPerKwh),
      lastHourKwh: energyKwh(count1h, deviceInfo.pulsesPerKwh)
    },
    series,
    generatedAt: new Date(nowMs).toISOString()
  };
}

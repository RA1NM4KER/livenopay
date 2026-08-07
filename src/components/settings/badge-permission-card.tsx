"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { isSyncStale } from "@/lib/sync-status";

type BadgePermissionCardProps = {
  // The current connection's last sync time, so toggling badges on can reflect
  // an already-stale state immediately instead of waiting for the next
  // dashboard visit or push.
  lastSyncedAt?: string | null;
};

type BadgeSupport = "unknown" | "unsupported" | "default" | "granted" | "denied";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// applicationServerKey must be a Uint8Array; the VAPID public key ships as a
// URL-safe base64 string.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  // Back it with a concrete ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which applicationServerKey (BufferSource) accepts.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// Creates (or reuses) this device's push subscription and registers it with
// the server, so the stale-check cron can reach it while the app is closed.
async function subscribeToPush(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // iOS/Chrome require this: every push must surface a visible notification.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }));

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON())
  });

  return response.ok;
}

// iOS 16.4+ only paints a Home Screen badge once the installed web app has
// notification permission, and that prompt must come from a real user gesture
// -- calling Notification.requestPermission() from an effect is ignored -- so
// it lives behind this button rather than firing automatically.
export function BadgePermissionCard({ lastSyncedAt }: BadgePermissionCardProps) {
  const [state, setState] = useState<BadgeSupport>("unknown");
  const [busy, setBusy] = useState(false);

  // Reflect current staleness onto the icon right away once badges are allowed,
  // matching what DataSyncAction would set on the next dashboard visit.
  const applyBadgeNow = useCallback(async () => {
    if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) {
      return;
    }
    try {
      if (isSyncStale(lastSyncedAt)) {
        // Explicit count: iOS renders nothing for a no-arg setAppBadge().
        await navigator.setAppBadge(1);
      } else {
        await navigator.clearAppBadge();
      }
    } catch (error) {
      console.error("Failed to set app badge", error);
    }
  }, [lastSyncedAt]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("setAppBadge" in navigator) || typeof Notification === "undefined") {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as BadgeSupport);

    // If permission was already granted (e.g. on an earlier visit, or before
    // background push existed), make sure this device is subscribed too, and
    // reflect current staleness onto the icon.
    if (Notification.permission === "granted") {
      subscribeToPush().catch((error) => console.error("Failed to sync push subscription", error));
      applyBadgeNow();
    }
  }, [applyBadgeNow]);

  const enableBadges = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setState(permission as BadgeSupport);
      if (permission === "granted") {
        await subscribeToPush();
        await applyBadgeNow();
      }
    } catch (error) {
      console.error("Failed to enable badges", error);
    } finally {
      setBusy(false);
    }
  }, [busy, applyBadgeNow]);

  if (state === "unsupported") {
    return null;
  }

  const { description, action } = describe(state, busy, enableBadges);

  return (
    <Card>
      <CardHeader title="Home screen badge" eyebrow="Notifications" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <p className="max-w-md text-sm text-muted">{description}</p>
        {action}
      </div>
    </Card>
  );
}

function describe(state: BadgeSupport, busy: boolean, enableBadges: () => void) {
  if (state === "granted") {
    return {
      description:
        "Badges are on. NewinMeter will badge its icon and send one notification when your data goes stale, then clear once it's fresh.",
      action: (
        <span className="inline-flex h-9 items-center rounded-md border border-line bg-canvas px-3 text-sm text-muted">
          Enabled
        </span>
      )
    };
  }

  if (state === "denied") {
    return {
      description:
        "Badges are blocked. Turn them back on in your device settings: Notifications → NewinMeter → Allow Notifications and Badges.",
      action: null
    };
  }

  return {
    description:
      "Badge the NewinMeter home screen icon and get one notification when your data goes stale. Requires notification permission on iOS.",
    action: (
      <button
        type="button"
        onClick={enableBadges}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-md border border-line bg-paper px-3 text-sm text-ink transition hover:bg-canvas disabled:opacity-60"
      >
        {busy ? "Requesting…" : "Enable badges"}
      </button>
    )
  };
}

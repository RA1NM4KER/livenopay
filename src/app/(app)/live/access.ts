// Pure Live-page access decision, extracted from page.tsx so the permission
// gate is unit-testable without importing the JSX server component. The page
// maps each outcome to redirect()/notFound()/render.

export type LiveAccessInput = {
  hasSession: boolean;
  liveMeterEnabled: boolean;
  isConnected: boolean;
};

// "notFound" is deliberately returned for an authenticated user without the
// permission -- the page must behave as though it does not exist, not merely
// deny access.
export type LiveAccess = "login" | "notFound" | "connect" | "ok";

export function resolveLiveAccess({ hasSession, liveMeterEnabled, isConnected }: LiveAccessInput): LiveAccess {
  if (!hasSession) return "login";
  if (!liveMeterEnabled) return "notFound";
  if (!isConnected) return "connect";
  return "ok";
}

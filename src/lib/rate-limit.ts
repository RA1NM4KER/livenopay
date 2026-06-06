const minuteWindowMs = 60_000;
const dayWindowMs = 86_400_000;

const RATE_LIMIT_POLICIES = {
  default: {
    minuteLimit: 60,
    dayLimit: 1000
  },
  assistant: {
    minuteLimit: 5,
    dayLimit: 30
  }
} as const;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

type WindowState = {
  count: number;
  resetAt: number;
};

type RateLimitState = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const minuteStates = new Map<string, WindowState>();
const dayStates = new Map<string, WindowState>();

function applyWindowLimit(
  store: Map<string, WindowState>,
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitState {
  const now = Date.now();
  const existing = store.get(identifier);
  const state =
    existing && now <= existing.resetAt
      ? existing
      : {
          count: 0,
          resetAt: now + windowMs
        };

  state.count += 1;
  store.set(identifier, state);

  return {
    success: state.count <= limit,
    limit,
    remaining: Math.max(0, limit - state.count),
    reset: Math.ceil(state.resetAt / 1000)
  };
}

export type RateLimitResult = {
  allowed: boolean;
  minute: RateLimitState;
  day: RateLimitState;
};

export function getRateLimitIdentifier(request: Request, scope?: string) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
  const base = ip ?? "unknown";

  return scope ? `${base}:${scope}` : base;
}

export async function enforceRateLimit(
  identifier: string,
  policyName: RateLimitPolicyName = "default"
): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[policyName];
  const minute = applyWindowLimit(minuteStates, identifier, policy.minuteLimit, minuteWindowMs);
  const day = applyWindowLimit(dayStates, identifier, policy.dayLimit, dayWindowMs);

  return {
    allowed: minute.success && day.success,
    minute,
    day
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit-Minute": String(result.minute.limit),
    "X-RateLimit-Remaining-Minute": String(result.minute.remaining),
    "X-RateLimit-Reset-Minute": String(result.minute.reset),
    "X-RateLimit-Limit-Day": String(result.day.limit),
    "X-RateLimit-Remaining-Day": String(result.day.remaining),
    "X-RateLimit-Reset-Day": String(result.day.reset)
  };
}

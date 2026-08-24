import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** Generous for a human behind the 200ms debounce (~5 req/s while
 * typing nonstop), tight for a script hammering the endpoint. */
const SUGGEST_LIMIT = 30;
const SUGGEST_WINDOW = "10 s";

/** undefined = not yet decided; null = env absent, limiting off. */
let limiter: Ratelimit | null | undefined;

/**
 * The rate limiter for /api/suggest, or null when Upstash isn't
 * configured. Enforcement is deliberately env-gated: local dev, CI,
 * and Playwright have no Upstash credentials and skip limiting, so
 * the code can land before the production env vars exist.
 *
 * Sliding window costs one Redis command per checked request; CDN
 * caching absorbs repeats before they reach the function at all.
 */
export function suggestLimiter(): Ratelimit | null {
  if (limiter !== undefined) {
    return limiter;
  }
  const configured =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  // Fail-open is deliberate (an env slip must not break search), but
  // never silent: unconfigured production says so in the logs. Runs
  // once per instance because the result is memoized above.
  if (!configured && process.env.VERCEL_ENV === "production") {
    console.warn(
      "suggest rate limiting is OFF: Upstash env vars are not set in production",
    );
  }
  limiter = configured
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(SUGGEST_LIMIT, SUGGEST_WINDOW),
        analytics: false,
        prefix: "typecast:suggest",
      })
    : null;
  return limiter;
}

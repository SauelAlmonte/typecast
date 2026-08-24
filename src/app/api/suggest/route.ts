import { type MediaMatch, searchMedia } from "@/db/queries";
import { suggestLimiter } from "@/lib/rate-limit";

/** One suggestion row, the shape the combobox renders. */
export type SuggestResult = MediaMatch;

/** Repeat queries die at the CDN; the catalog changes once a day at
 * most, so an hour fresh plus a day stale matches the rails route. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

/** Longer than any real title fragment; junk past it never reaches
 * Postgres, where word_similarity cost scales with query length. */
const MAX_QUERY_LENGTH = 100;

/**
 * Suggest catalog titles for a search-as-you-type fragment.
 *
 * Matching and ranking live in {@link searchMedia}, shared with the
 * results page; this handler only parses params and sets cache policy.
 *
 * @param request - Query params: `q` (the fragment) and optional `limit`
 *   (result count, capped at 20, default 8).
 * @returns JSON array of {@link SuggestResult}, empty for a blank `q`.
 */
export async function GET(request: Request): Promise<Response> {
  // Env-gated: null outside production (see rate-limit.ts). The 429
  // body stays the empty-array shape the combobox renders, so a
  // limited client shows no suggestions instead of breaking.
  const limiter = suggestLimiter();
  if (limiter) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const { success } = await limiter.limit(ip);
    if (!success) {
      return Response.json([], {
        status: 429,
        headers: { "Retry-After": "10", "Cache-Control": "no-store" },
      });
    }
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  // Only a positive integer may reach SQL's LIMIT; anything else
  // (missing, NaN, zero, negative, fractional) gets the default.
  const parsed = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(parsed) && parsed > 0
      ? Math.min(parsed, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const rows = await searchMedia(q, limit);
  return Response.json(rows, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

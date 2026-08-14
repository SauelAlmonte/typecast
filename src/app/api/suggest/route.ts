import { type MediaMatch, searchMedia } from "@/db/queries";

/** One suggestion row, the shape the combobox renders. */
export type SuggestResult = MediaMatch;

/** Repeat queries die at the CDN; the catalog changes once a day at most. */
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

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
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
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

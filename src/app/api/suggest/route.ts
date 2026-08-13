import { desc, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { normalizeSearchText } from "@/lib/normalize";

/** One suggestion row, the shape the combobox will render. */
export type SuggestResult = {
  id: number;
  mediaType: string;
  title: string;
  year: number | null;
  posterPath: string | null;
};

/** Repeat queries die at the CDN; the catalog changes once a day at most. */
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

const selection = {
  id: media.id,
  mediaType: media.mediaType,
  title: media.title,
  year: sql<number | null>`extract(year from ${media.releaseDate})::int`,
  posterPath: media.posterPath,
};

/**
 * Suggest catalog titles for a search-as-you-type fragment.
 *
 * The fragment is normalized exactly like `title_search` was at ingest,
 * then matched by length: 1-2 characters use a prefix scan (trigrams
 * need 3 characters to exist), 3+ use trigram matching.
 *
 * @param request - Query params: `q` (the fragment) and optional `limit`
 *   (result count, capped at 20, default 8).
 * @returns JSON array of {@link SuggestResult}, empty for a blank `q`.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = normalizeSearchText(searchParams.get("q") ?? "");
  const limit = Math.min(
    Number(searchParams.get("limit")) || DEFAULT_LIMIT,
    MAX_LIMIT,
  );

  if (q === "") {
    return json([]);
  }

  const db = getDb();

  if (q.length < 3) {
    // Escape LIKE wildcards so a literal % or _ in the fragment can't
    // change the pattern's meaning.
    const prefix = `${q.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await db
      .select(selection)
      .from(media)
      .where(like(media.titleSearch, prefix))
      .orderBy(desc(media.popularity))
      .limit(limit);
    return json(rows);
  }

  // TODO(Sauel): ranking. This placeholder filters on word_similarity and
  // orders by popularity alone. The agreed design:
  //   1. exact-prefix matches first,
  //   2. then word_similarity(q, title_search) descending,
  //   3. popularity as the tiebreaker.
  // Constraints found while building this:
  //   - Whole-title similarity() under-scores short fragments (live case:
  //     "stran" vs Stranger Things scored 0.294). word_similarity() scores
  //     against the best-matching span instead: pg_trgm docs, F.33.2.
  //   - The neon-http driver is stateless per query: SET / set_limit() do
  //     not persist, so thresholds must live in the WHERE clause as an
  //     explicit comparison, not as a session GUC.
  //   - The <% operator uses the GIN index but hard-codes the 0.6 default
  //     threshold; word_similarity(...) > x in WHERE is index-blind but
  //     tunable. At catalog scale the planner seq-scans either way.
  const rows = await db
    .select(selection)
    .from(media)
    .where(sql`word_similarity(${q}, ${media.titleSearch}) > 0.15`)
    .orderBy(desc(media.popularity))
    .limit(limit);
  return json(rows);
}

/** Wrap a payload with the shared cache policy. */
function json(payload: SuggestResult[]): Response {
  return Response.json(payload, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

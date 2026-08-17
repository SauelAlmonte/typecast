import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { normalizeSearchText } from "@/lib/normalize";

/** The two kinds the catalog holds; used to scope search and browse. */
export type MediaKind = "movie" | "tv";

/** One catalog match, the shape every search surface renders.
 * tmdbId rides along because every match is now a link to the title
 * page, whose route speaks TMDB's ids, not our identity column. */
export type MediaMatch = {
  id: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  posterPath: string | null;
};

const selection = {
  id: media.id,
  tmdbId: media.tmdbId,
  mediaType: media.mediaType,
  title: media.title,
  year: sql<number | null>`extract(year from ${media.releaseDate})::int`,
  posterPath: media.posterPath,
};

/**
 * Rank catalog titles against a search fragment. Shared by the suggest
 * endpoint and the results page so both surfaces agree on ordering.
 *
 * The fragment is normalized exactly like `title_search` was at ingest,
 * then matched by length: 1-2 characters use a prefix scan (trigrams
 * need 3 characters to exist), 3+ use trigram matching with the ranking
 * Sauel designed:
 *   1. exact-prefix matches first,
 *   2. then word_similarity(q, title_search) descending,
 *   3. popularity as the tiebreaker.
 *
 * Constraints found while building this:
 *   - Whole-title similarity() under-scores short fragments (live case:
 *     "stran" vs Stranger Things scored 0.294). word_similarity() scores
 *     against the best-matching span instead: pg_trgm docs, F.33.2.
 *   - The neon-http driver is stateless per query: SET / set_limit() do
 *     not persist, so thresholds must live in the WHERE clause as an
 *     explicit comparison, not as a session GUC.
 *   - The <% operator uses the GIN index but hard-codes the 0.6 default
 *     threshold; word_similarity(...) > x in WHERE is index-blind but
 *     tunable. At catalog scale the planner seq-scans either way.
 *
 * @param rawQuery - The fragment as the user typed it; normalized here.
 * @param limit - Maximum rows to return; callers enforce their own caps.
 * @param kind - Optional scope: only movies or only TV shows.
 * @returns Ranked matches, empty when the fragment normalizes to "".
 */
export async function searchMedia(
  rawQuery: string,
  limit: number,
  kind?: MediaKind,
): Promise<MediaMatch[]> {
  const q = normalizeSearchText(rawQuery);
  if (q === "") {
    return [];
  }

  const db = getDb();

  // and() drops undefined members, so no kind means no extra clause.
  const kindClause = kind ? eq(media.mediaType, kind) : undefined;

  // Escape LIKE wildcards so a literal % or _ in the fragment can't
  // change the pattern's meaning. Both branches match against this.
  const prefix = `${q.replace(/[\\%_]/g, "\\$&")}%`;

  if (q.length < 3) {
    return db
      .select(selection)
      .from(media)
      .where(and(like(media.titleSearch, prefix), kindClause))
      .orderBy(desc(media.popularity))
      .limit(limit);
  }

  return db
    .select(selection)
    .from(media)
    .where(
      and(
        sql`(${media.titleSearch} like ${prefix}
            or word_similarity(${q}, ${media.titleSearch}) > 0.4)`,
        kindClause,
      ),
    )
    .orderBy(
      sql`(${media.titleSearch} like ${prefix}) desc`,
      sql`word_similarity(${q}, ${media.titleSearch}) desc`,
      desc(media.popularity),
    )
    .limit(limit);
}

/**
 * Browse a kind without a query: the catalog's most popular titles,
 * for the Movies and TV Shows nav destinations.
 *
 * @param kind - Which catalog half to browse.
 * @param limit - Maximum rows to return.
 */
export async function popularMedia(
  kind: MediaKind,
  limit: number,
): Promise<MediaMatch[]> {
  const db = getDb();
  return db
    .select(selection)
    .from(media)
    .where(eq(media.mediaType, kind))
    .orderBy(desc(media.popularity))
    .limit(limit);
}

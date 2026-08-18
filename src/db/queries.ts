import { and, desc, eq, isNotNull, like, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { genres, media, mediaGenres } from "@/db/schema";
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

/** A rail card: posterPath is non-null by query, because the card IS
 * the poster; posterless rows are excluded before ranking, so the
 * rail minimum counts only what renders. */
export type RailTitle = Omit<MediaMatch, "posterPath"> & {
  posterPath: string;
};

/** One genre's rail: the genre and its top titles, ready to render. */
export type GenreRail = {
  genreId: number;
  name: string;
  titles: RailTitle[];
};

/* Sauel's rail order per scope, TMDB ids with names alongside.
 * Reordering a page is reordering its array. A genre missing from its
 * array still renders, appended after the curated run in name order,
 * so catalog growth never disappears silently. */
const MOVIE_RAIL_ORDER = [
  28, // Action
  12, // Adventure
  878, // Science Fiction
  14, // Fantasy
  35, // Comedy
  18, // Drama
  53, // Thriller
  27, // Horror
  9648, // Mystery
  80, // Crime
  16, // Animation
  10751, // Family
  10749, // Romance
  99, // Documentary
  36, // History
  10402, // Music
  10752, // War
  37, // Western
  10770, // TV Movie
];

const TV_RAIL_ORDER = [
  10759, // Action & Adventure
  10765, // Sci-Fi & Fantasy
  35, // Comedy
  18, // Drama
  9648, // Mystery
  80, // Crime
  16, // Animation
  10751, // Family
  10762, // Kids
  10764, // Reality
  99, // Documentary
  10766, // Soap
  10767, // Talk
  10763, // News
  10768, // War & Politics
  37, // Western
];

// A rail of two or three titles looks broken; four is the floor.
const RAIL_MIN = 4;
// Matches the landing rails' length.
const RAIL_CAP = 20;

/**
 * Every genre rail for one scope in a single round trip: titles ranked
 * inside their genre by the same popularity order `popularMedia` uses,
 * capped per rail, with sparse genres (fewer than `RAIL_MIN` titles)
 * sitting out until the catalog grows into them. Posterless rows never
 * enter the ranking; the rail card is the poster.
 *
 * One statement on purpose: `row_number()` partitioned by genre does
 * per-rail ranking and capping in the database, so the alternative
 * (one query per genre) never exists to get slow.
 *
 * @param kind - Which catalog half to build rails for.
 * @returns Rails in the curated order, each with its top titles.
 */
export async function genreRails(kind: MediaKind): Promise<GenreRail[]> {
  const db = getDb();

  const ranked = db.$with("ranked").as(
    db
      .select({
        id: media.id,
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        title: media.title,
        year: sql<
          number | null
        >`extract(year from ${media.releaseDate})::int`.as("year"),
        posterPath: media.posterPath,
        genreId: mediaGenres.genreId,
        pos: sql<number>`row_number() over (partition by ${mediaGenres.genreId} order by ${media.popularity} desc, ${media.id})`.as(
          "pos",
        ),
        railSize:
          sql<number>`count(*) over (partition by ${mediaGenres.genreId})`.as(
            "rail_size",
          ),
      })
      .from(media)
      .innerJoin(mediaGenres, eq(mediaGenres.mediaId, media.id))
      .where(and(eq(media.mediaType, kind), isNotNull(media.posterPath))),
  );

  const rows = await db
    .with(ranked)
    .select({
      genreId: ranked.genreId,
      name: genres.name,
      id: ranked.id,
      tmdbId: ranked.tmdbId,
      mediaType: ranked.mediaType,
      title: ranked.title,
      year: ranked.year,
      posterPath: sql<string>`${ranked.posterPath}`,
    })
    .from(ranked)
    .innerJoin(genres, eq(genres.id, ranked.genreId))
    .where(
      and(
        sql`${ranked.pos} <= ${RAIL_CAP}`,
        sql`${ranked.railSize} >= ${RAIL_MIN}`,
      ),
    )
    .orderBy(ranked.genreId, ranked.pos);

  const byGenre = new Map<number, GenreRail>();
  for (const row of rows) {
    let rail = byGenre.get(row.genreId);
    if (!rail) {
      rail = { genreId: row.genreId, name: row.name, titles: [] };
      byGenre.set(row.genreId, rail);
    }
    rail.titles.push({
      id: row.id,
      tmdbId: row.tmdbId,
      mediaType: row.mediaType,
      title: row.title,
      year: row.year,
      posterPath: row.posterPath,
    });
  }

  const order = kind === "movie" ? MOVIE_RAIL_ORDER : TV_RAIL_ORDER;
  const position = (rail: GenreRail) => {
    const i = order.indexOf(rail.genreId);
    return i === -1 ? order.length : i;
  };
  return [...byGenre.values()].sort(
    (a, b) => position(a) - position(b) || a.name.localeCompare(b.name),
  );
}

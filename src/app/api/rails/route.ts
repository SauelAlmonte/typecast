import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { media, mediaList } from "@/db/schema";

/** One card in a category rail; posterPath is non-null by query.
 * tmdbId is the card's link target: title routes speak TMDB ids. */
export type RailItem = {
  id: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  posterPath: string;
};

/** One category rail: TMDB's list, in TMDB's order. */
export type Rail = {
  slug: string;
  title: string;
  items: RailItem[];
};

/**
 * The landing page's rails, mirroring TMDB's Movies and TV Shows
 * menus. Slugs are the contract with scripts/sync-media.ts, which
 * fills `media_list` from the endpoints of the same names.
 */
const RAIL_DEFS = [
  { slug: "movie-popular", title: "Popular Movies" },
  { slug: "movie-now-playing", title: "Now Playing in Theaters" },
  { slug: "movie-upcoming", title: "Upcoming Movies" },
  { slug: "movie-top-rated", title: "Top Rated Movies" },
  { slug: "tv-popular", title: "Popular TV Shows" },
  { slug: "tv-airing-today", title: "TV Airing Today" },
  { slug: "tv-on-the-air", title: "TV On the Air" },
  { slug: "tv-top-rated", title: "Top Rated TV Shows" },
];

const RAIL_LIMIT = 20;

/** Rails change at sync cadence, once a day; let the CDN hold them. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

/**
 * Every category rail in one response, so the landing page costs one
 * request instead of eight. Order within each rail is TMDB's own
 * ranking (`media_list.position`), not popularity. Posterless rows
 * are excluded because the card IS the poster.
 *
 * @returns JSON array of {@link Rail}, in menu order.
 */
export async function GET(): Promise<Response> {
  const db = getDb();
  const rails: Rail[] = await Promise.all(
    RAIL_DEFS.map(async ({ slug, title }) => ({
      slug,
      title,
      items: await db
        .select({
          id: media.id,
          tmdbId: media.tmdbId,
          mediaType: media.mediaType,
          title: media.title,
          year: sql<
            number | null
          >`extract(year from ${media.releaseDate})::int`,
          posterPath: sql<string>`${media.posterPath}`,
        })
        .from(mediaList)
        .innerJoin(media, eq(mediaList.mediaId, media.id))
        .where(and(eq(mediaList.listSlug, slug), isNotNull(media.posterPath)))
        .orderBy(asc(mediaList.position))
        .limit(RAIL_LIMIT),
    })),
  );

  return Response.json(rails, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

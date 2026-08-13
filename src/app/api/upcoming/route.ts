import { and, desc, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { media } from "@/db/schema";

/** One carousel card; posterPath is non-null by query construction. */
export type UpcomingItem = {
  id: number;
  mediaType: string;
  title: string;
  year: number | null;
  posterPath: string;
};

/** The rail changes at sync cadence, once a day; let the CDN hold it. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

const LIMIT = 18;

/**
 * Latest and upcoming titles for the hero carousel.
 *
 * The catalog has no origin-list column, so "latest and upcoming" is
 * derived from dates: anything released in the last 90 days or dated in
 * the future. Descending release date puts unreleased titles first,
 * then the freshest, with popularity breaking ties. Posterless rows are
 * excluded because the card IS the poster.
 *
 * @returns JSON array of {@link UpcomingItem}, newest first.
 */
export async function GET(): Promise<Response> {
  const db = getDb();
  const rows = await db
    .select({
      id: media.id,
      mediaType: media.mediaType,
      title: media.title,
      year: sql<number | null>`extract(year from ${media.releaseDate})::int`,
      posterPath: sql<string>`${media.posterPath}`,
    })
    .from(media)
    .where(
      and(
        isNotNull(media.posterPath),
        sql`${media.releaseDate} >= current_date - interval '90 days'`,
      ),
    )
    .orderBy(desc(media.releaseDate), desc(media.popularity))
    .limit(LIMIT);

  return Response.json(rows, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

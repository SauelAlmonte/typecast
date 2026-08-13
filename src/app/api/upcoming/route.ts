import { and, desc, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { media } from "@/db/schema";

/** One hero rotation entry; both art paths are non-null by query. The
 * poster rides along for portrait viewports, where a widescreen backdrop
 * would crop away its subject. */
export type UpcomingItem = {
  id: number;
  mediaType: string;
  title: string;
  year: number | null;
  backdropPath: string;
  posterPath: string;
};

/** The rotation changes at sync cadence, once a day; let the CDN hold it. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

const LIMIT = 6;

/**
 * Latest and upcoming titles for the hero's rotating backdrop.
 *
 * The catalog has no origin-list column, so "latest and upcoming" is
 * derived from dates: anything released in the last 90 days or dated in
 * the future. Descending release date puts unreleased titles first,
 * then the freshest, with popularity breaking ties. Backdropless rows
 * are excluded because the backdrop IS the feature.
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
      backdropPath: sql<string>`${media.backdropPath}`,
      posterPath: sql<string>`${media.posterPath}`,
    })
    .from(media)
    .where(
      and(
        isNotNull(media.backdropPath),
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

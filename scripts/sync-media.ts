import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { media, type NewMedia } from "../src/db/schema";
import { normalizeSearchText } from "../src/lib/normalize";
import { fetchTmdbList, type TmdbListItem } from "../src/lib/tmdb";

/**
 * A TMDB list to ingest: the endpoint, how many pages, and which media
 * type its items are when the payload doesn't say (`/trending` includes
 * `media_type` per item; single-type lists imply it).
 */
type ListSource = {
  path: string;
  pages: number;
  impliedType?: "movie" | "tv";
};

/**
 * The catalog recipe: trending for breadth, popular for depth per type,
 * upcoming/on-the-air so the hero rotation has fresh material.
 */
const SOURCES: ListSource[] = [
  { path: "/trending/all/week", pages: 3 },
  { path: "/movie/popular", pages: 3, impliedType: "movie" },
  { path: "/tv/popular", pages: 3, impliedType: "tv" },
  { path: "/movie/upcoming", pages: 2, impliedType: "movie" },
  { path: "/tv/on_the_air", pages: 2, impliedType: "tv" },
];

/**
 * Normalize one TMDB list item into a `media` row.
 *
 * @param item - Raw TMDB payload entry.
 * @param impliedType - Media type implied by the source endpoint, used
 *   when the item doesn't carry its own `media_type`.
 * @returns A row ready to insert, or `null` for entries the catalog
 *   doesn't want: people, or items with no id or title.
 */
function toMediaRow(
  item: TmdbListItem,
  impliedType?: "movie" | "tv",
): NewMedia | null {
  const mediaType = item.media_type ?? impliedType;
  if (mediaType !== "movie" && mediaType !== "tv") return null;

  const title = mediaType === "movie" ? item.title : item.name;
  if (!item.id || !title) return null;

  return {
    tmdbId: item.id,
    mediaType,
    title,
    titleSearch: normalizeSearchText(title),
    releaseDate:
      (mediaType === "movie" ? item.release_date : item.first_air_date) || null,
    popularity: item.popularity ?? 0,
    voteAverage: item.vote_average ?? null,
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
  };
}

async function main() {
  const rows = new Map<string, NewMedia>();

  for (const source of SOURCES) {
    for (let page = 1; page <= source.pages; page++) {
      const { results } = await fetchTmdbList(source.path, page);
      for (const item of results) {
        const row = toMediaRow(item, source.impliedType);
        // Last write wins on duplicates across lists; the payloads for the
        // same (type, id) are identical, so order doesn't matter.
        if (row) rows.set(`${row.mediaType}:${row.tmdbId}`, row);
      }
    }
    console.log(`${source.path}: ${rows.size} rows accumulated`);
  }

  const values = [...rows.values()];
  await db
    .insert(media)
    .values(values)
    .onConflictDoUpdate({
      target: [media.mediaType, media.tmdbId],
      set: {
        title: sql`excluded.title`,
        titleSearch: sql`excluded.title_search`,
        releaseDate: sql`excluded.release_date`,
        popularity: sql`excluded.popularity`,
        voteAverage: sql`excluded.vote_average`,
        posterPath: sql`excluded.poster_path`,
        backdropPath: sql`excluded.backdrop_path`,
        updatedAt: sql`now()`,
      },
    });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(media);
  console.log(`Upserted ${values.length} rows; media table now has ${count}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

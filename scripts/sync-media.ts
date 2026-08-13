import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  type MediaListRow,
  media,
  mediaList,
  type NewMedia,
} from "../src/db/schema";
import { normalizeSearchText } from "../src/lib/normalize";
import { fetchTmdbList, type TmdbListItem } from "../src/lib/tmdb";

/**
 * A TMDB list to ingest: the endpoint, how many pages, and which media
 * type its items are when the payload doesn't say (`/trending` includes
 * `media_type` per item; single-type lists imply it).
 *
 * `slug` marks a list whose membership and ordering the site shows as
 * a category rail; slugless sources only feed the catalog. Slugs are
 * the contract with /api/rails and the landing page.
 */
type ListSource = {
  path: string;
  pages: number;
  impliedType?: "movie" | "tv";
  slug?: string;
};

/**
 * The catalog recipe: trending for breadth, then TMDB's own category
 * lists for movies and TV, mirroring the rails under the hero.
 */
const SOURCES: ListSource[] = [
  { path: "/trending/all/week", pages: 3 },
  {
    path: "/movie/popular",
    pages: 2,
    impliedType: "movie",
    slug: "movie-popular",
  },
  {
    path: "/movie/now_playing",
    pages: 2,
    impliedType: "movie",
    slug: "movie-now-playing",
  },
  {
    path: "/movie/upcoming",
    pages: 2,
    impliedType: "movie",
    slug: "movie-upcoming",
  },
  {
    path: "/movie/top_rated",
    pages: 2,
    impliedType: "movie",
    slug: "movie-top-rated",
  },
  { path: "/tv/popular", pages: 2, impliedType: "tv", slug: "tv-popular" },
  {
    path: "/tv/airing_today",
    pages: 2,
    impliedType: "tv",
    slug: "tv-airing-today",
  },
  {
    path: "/tv/on_the_air",
    pages: 2,
    impliedType: "tv",
    slug: "tv-on-the-air",
  },
  { path: "/tv/top_rated", pages: 2, impliedType: "tv", slug: "tv-top-rated" },
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
  const db = getDb();
  const rows = new Map<string, NewMedia>();
  // Per slug, the ordered member keys exactly as TMDB ranked them.
  const memberships = new Map<string, string[]>();

  for (const source of SOURCES) {
    const members: string[] = [];
    for (let page = 1; page <= source.pages; page++) {
      const { results } = await fetchTmdbList(source.path, page);
      for (const item of results) {
        const row = toMediaRow(item, source.impliedType);
        if (!row) continue;
        const key = `${row.mediaType}:${row.tmdbId}`;
        // Last write wins on duplicates across lists; the payloads for the
        // same (type, id) are identical, so order doesn't matter.
        rows.set(key, row);
        // Within one list, first sighting keeps TMDB's rank.
        if (source.slug && !members.includes(key)) members.push(key);
      }
    }
    if (source.slug) memberships.set(source.slug, members);
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

  // Membership needs database ids, which the upsert doesn't return for
  // conflicting rows, so read the whole (small) catalog back once.
  const idRows = await db
    .select({ id: media.id, mediaType: media.mediaType, tmdbId: media.tmdbId })
    .from(media);
  const idByKey = new Map(
    idRows.map((r) => [`${r.mediaType}:${r.tmdbId}`, r.id]),
  );

  // Replace each list wholesale: membership reflects this sync only.
  for (const [slug, members] of memberships) {
    const listRows: MediaListRow[] = [];
    for (const [position, key] of members.entries()) {
      const id = idByKey.get(key);
      if (id !== undefined) {
        listRows.push({ listSlug: slug, mediaId: id, position });
      }
    }
    await db.delete(mediaList).where(eq(mediaList.listSlug, slug));
    if (listRows.length > 0) {
      await db.insert(mediaList).values(listRows);
    }
    console.log(`${slug}: ${listRows.length} members`);
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(media);
  console.log(`Upserted ${values.length} rows; media table now has ${count}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

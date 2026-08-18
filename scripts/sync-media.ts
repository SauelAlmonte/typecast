import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  genres,
  type MediaGenreRow,
  type MediaListRow,
  media,
  mediaGenres,
  mediaList,
  type NewMedia,
} from "../src/db/schema";
import { normalizeSearchText } from "../src/lib/normalize";
import {
  fetchTmdbGenres,
  fetchTmdbList,
  type TmdbListItem,
} from "../src/lib/tmdb";

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
  // Per title, its TMDB genre ids; every list payload carries them.
  const genreIdsByKey = new Map<string, number[]>();

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
        genreIdsByKey.set(key, item.genre_ids ?? []);
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

  // Upsert-then-prune, not delete-then-insert: the neon-http driver
  // has no transactions, but each statement is atomic on its own, so
  // readers of /api/rails only ever see a complete list: the old one,
  // briefly a merged one, or the new one. Never an empty one, even if
  // the sync dies between the two statements.
  for (const [slug, members] of memberships) {
    const listRows: MediaListRow[] = [];
    for (const [position, key] of members.entries()) {
      const id = idByKey.get(key);
      if (id !== undefined) {
        listRows.push({ listSlug: slug, mediaId: id, position });
      }
    }
    if (listRows.length > 0) {
      await db
        .insert(mediaList)
        .values(listRows)
        .onConflictDoUpdate({
          target: [mediaList.listSlug, mediaList.mediaId],
          set: { position: sql`excluded.position` },
        });
      await db.delete(mediaList).where(
        and(
          eq(mediaList.listSlug, slug),
          notInArray(
            mediaList.mediaId,
            listRows.map((r) => r.mediaId),
          ),
        ),
      );
    } else {
      await db.delete(mediaList).where(eq(mediaList.listSlug, slug));
    }
    console.log(`${slug}: ${listRows.length} members`);
  }

  // The genre vocabulary, both scopes merged by their shared id space;
  // names refresh in place if TMDB ever renames one.
  const [movieGenres, tvGenres] = await Promise.all([
    fetchTmdbGenres("movie"),
    fetchTmdbGenres("tv"),
  ]);
  const vocabulary = new Map(
    [...movieGenres, ...tvGenres].map((g) => [g.id, g.name]),
  );
  await db
    .insert(genres)
    .values([...vocabulary].map(([id, name]) => ({ id, name })))
    .onConflictDoUpdate({
      target: genres.id,
      set: { name: sql`excluded.name` },
    });

  // Membership pairs for every title seen this run, filtered to the
  // vocabulary so a stray id in a payload can't break the FK.
  const pairs: MediaGenreRow[] = [];
  const syncedIds: number[] = [];
  for (const [key, genreIds] of genreIdsByKey) {
    const mediaId = idByKey.get(key);
    if (mediaId === undefined) continue;
    syncedIds.push(mediaId);
    for (const genreId of genreIds) {
      if (vocabulary.has(genreId)) pairs.push({ mediaId, genreId });
    }
  }

  // Same upsert-then-prune as the lists, for the same reason: no
  // transactions on this driver, so readers never see an empty set.
  if (pairs.length > 0) {
    await db.insert(mediaGenres).values(pairs).onConflictDoNothing();
    await db.delete(mediaGenres).where(
      and(
        inArray(mediaGenres.mediaId, syncedIds),
        sql`(${mediaGenres.mediaId}, ${mediaGenres.genreId}) not in (${sql.join(
          pairs.map((p) => sql`(${p.mediaId}, ${p.genreId})`),
          sql`, `,
        )})`,
      ),
    );
  } else if (syncedIds.length > 0) {
    await db.delete(mediaGenres).where(inArray(mediaGenres.mediaId, syncedIds));
  }
  console.log(
    `genres: ${vocabulary.size} in vocabulary, ${pairs.length} memberships`,
  );

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(media);
  console.log(`Upserted ${values.length} rows; media table now has ${count}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

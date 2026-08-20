import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { type NewPerson, people } from "../src/db/schema";
import { normalizeSearchText } from "../src/lib/normalize";
import { fetchTmdbList, type TmdbListItem } from "../src/lib/tmdb";

/** Pages of /person/popular to ingest, 20 people each. */
const PAGES = 3;

/**
 * Normalize one TMDB person entry into a `people` row.
 *
 * @param item - Raw TMDB payload entry.
 * @returns A row ready to insert, or `null` for entries with no id or
 *   name.
 */
function toPersonRow(item: TmdbListItem): NewPerson | null {
  if (!item.id || !item.name) return null;

  return {
    tmdbId: item.id,
    name: item.name,
    nameSearch: normalizeSearchText(item.name),
    knownForDepartment: item.known_for_department ?? null,
    popularity: item.popularity ?? 0,
    profilePath: item.profile_path ?? null,
  };
}

async function main() {
  const db = getDb();
  // Keyed by TMDB id: last write wins if a person repeats across pages.
  const rows = new Map<number, NewPerson>();

  for (let page = 1; page <= PAGES; page++) {
    const { results } = await fetchTmdbList("/person/popular", page);
    for (const item of results) {
      const row = toPersonRow(item);
      if (row) rows.set(row.tmdbId, row);
    }
    console.log(`/person/popular page ${page}: ${rows.size} rows accumulated`);
  }

  const values = [...rows.values()];
  await db
    .insert(people)
    .values(values)
    .onConflictDoUpdate({
      target: people.tmdbId,
      set: {
        name: sql`excluded.name`,
        nameSearch: sql`excluded.name_search`,
        knownForDepartment: sql`excluded.known_for_department`,
        popularity: sql`excluded.popularity`,
        profilePath: sql`excluded.profile_path`,
        updatedAt: sql`now()`,
      },
    });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(people);
  console.log(`Upserted ${values.length} rows; people table now has ${count}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

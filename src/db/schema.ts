import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const media = pgTable(
  "media",
  {
    id: bigint("id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").notNull(),
    // TMDB calls this `title` for movies and `name` for TV; normalized here
    // so search never cares which kind of row it's matching.
    title: text("title").notNull(),
    // Filled by normalizeSearchText at sync time; all matching runs against
    // this column while `title` stays untouched for display. The default
    // covers rows from before the column existed until the next sync.
    titleSearch: text("title_search").notNull().default(""),
    releaseDate: date("release_date"),
    popularity: real("popularity").notNull().default(0),
    voteAverage: real("vote_average"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("media_media_type_tmdb_id_unique").on(table.mediaType, table.tmdbId),
    check("media_media_type_check", sql`${table.mediaType} in ('movie', 'tv')`),
    index("media_title_search_trgm_idx").using(
      "gin",
      sql`${table.titleSearch} gin_trgm_ops`,
    ),
  ],
);

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

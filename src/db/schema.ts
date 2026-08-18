import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
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

/**
 * Which TMDB category lists a title belongs to, with its rank inside
 * each. A title sits in many lists at once (popular AND top rated), so
 * membership is a join table, not a column on `media`. The sync
 * replaces each list wholesale, so rows never go stale.
 */
export const mediaList = pgTable(
  "media_list",
  {
    listSlug: text("list_slug").notNull(),
    mediaId: bigint("media_id", { mode: "number" })
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    // Rank within the list, straight from TMDB's ordering.
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.listSlug, table.mediaId] }),
    index("media_list_slug_position_idx").on(table.listSlug, table.position),
  ],
);

export type MediaListRow = typeof mediaList.$inferInsert;

/**
 * TMDB's genre vocabulary, both scopes in one table: the movie and TV
 * genre lists share one id space (Drama is 18 in both), so rows from
 * /genre/movie/list and /genre/tv/list merge by id. The id is TMDB's,
 * not ours — list payloads reference it directly via `genre_ids`.
 */
export const genres = pgTable("genres", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

export type Genre = typeof genres.$inferSelect;

/**
 * Which genres a title belongs to. Same shape as `media_list` for the
 * same reason: a title carries several genres at once, and the sync
 * replaces memberships wholesale so rows never go stale. No position
 * column — TMDB's `genre_ids` order carries no meaning.
 */
export const mediaGenres = pgTable(
  "media_genres",
  {
    mediaId: bigint("media_id", { mode: "number" })
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.mediaId, table.genreId] }),
    // The genre pages ask "all titles in genre X"; the PK only serves
    // the media-first direction.
    index("media_genres_genre_id_idx").on(table.genreId),
  ],
);

export type MediaGenreRow = typeof mediaGenres.$inferInsert;

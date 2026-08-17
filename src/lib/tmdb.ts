const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * One entry from a TMDB list endpoint.
 *
 * The shape is endpoint-dependent: movies carry `title`/`release_date`,
 * TV carries `name`/`first_air_date`, and only the trending endpoints
 * include `media_type` (single-type lists omit it because it's implied).
 */
export type TmdbListItem = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
  vote_average?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

/** Envelope common to every paginated TMDB list endpoint. */
export type TmdbListResponse = {
  page: number;
  total_pages: number;
  results: TmdbListItem[];
};

export type TmdbGenre = { id: number; name: string };
export type TmdbCastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};
export type TmdbCrewMember = { id: number; name: string; job?: string };
export type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  official?: boolean;
  name?: string;
};
export type TmdbSeason = {
  id: number;
  season_number: number;
  name: string;
  air_date?: string | null;
  episode_count?: number;
  overview?: string;
  poster_path?: string | null;
};
export type TmdbKeyword = { id: number; name: string };
export type TmdbImage = {
  file_path: string;
  /** Language of any text burned into the image; null means textless. */
  iso_639_1?: string | null;
  vote_count?: number;
};

/**
 * A movie or TV detail response with the appended sub-resources the
 * title page renders. Movie and TV spell fields differently
 * (`title`/`name`, `release_date`/`first_air_date`, certifications in
 * `release_dates` vs `content_ratings`, keywords under `keywords` vs
 * `results`); the union carries both spellings and the page normalizes.
 */
export type TmdbTitleDetail = {
  id: number;
  title?: string;
  name?: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  status?: string;
  original_language?: string;
  vote_average?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: TmdbGenre[];
  production_companies?: { name: string }[];
  networks?: { name: string }[];
  created_by?: { name: string }[];
  seasons?: TmdbSeason[];
  credits?: { cast?: TmdbCastMember[]; crew?: TmdbCrewMember[] };
  videos?: { results?: TmdbVideo[] };
  recommendations?: { results?: TmdbListItem[] };
  keywords?: { keywords?: TmdbKeyword[]; results?: TmdbKeyword[] };
  images?: { backdrops?: TmdbImage[] };
  release_dates?: {
    results?: {
      iso_3166_1: string;
      release_dates?: { certification?: string }[];
    }[];
  };
  content_ratings?: { results?: { iso_3166_1: string; rating?: string }[] };
};

/** One TMDB request covers everything a title page shows. */
const DETAIL_APPEND = {
  movie: "credits,videos,recommendations,keywords,release_dates,images",
  tv: "credits,videos,recommendations,keywords,content_ratings,images",
} as const;

/** Details drift about as fast as the catalog: a day of cache is fine. */
const DETAIL_REVALIDATE_S = 86_400;

/**
 * Fetch one title's full detail record, sub-resources appended, so the
 * title page costs a single TMDB request. Cached in the framework data
 * cache for a day per URL.
 *
 * @param mediaType - Which TMDB namespace the id lives in.
 * @param tmdbId - TMDB's own id, the one our catalog stores as `tmdb_id`.
 * @returns The decoded detail, or null when TMDB has no such title, so
 *   the page can 404 instead of 500.
 * @throws When the token is missing or TMDB fails with anything but 404.
 */
export async function fetchTmdbDetail(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<TmdbTitleDetail | null> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_READ_ACCESS_TOKEN is not set. Add it to .env.local.");
  }

  const url = new URL(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}`);
  url.searchParams.set("append_to_response", DETAIL_APPEND[mediaType]);
  // Without this, appended images are filtered to the request language
  // and the textless backdrops (iso_639_1 null) never arrive.
  url.searchParams.set("include_image_language", "null,en");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: { revalidate: DETAIL_REVALIDATE_S },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TMDB ${res.status} on /${mediaType}/${tmdbId}: ${body.slice(0, 200)}`,
    );
  }

  return (await res.json()) as TmdbTitleDetail;
}

/**
 * Fetch one page of a TMDB v3 list endpoint.
 *
 * Authenticates with the v4 Read Access Token in an Authorization header,
 * never in the query string, so the secret stays out of URLs and logs.
 *
 * @param path - Endpoint path relative to the v3 root, e.g. `/movie/popular`.
 * @param page - 1-based page number; TMDB serves 20 items per page.
 * @returns The decoded list envelope.
 * @throws When `TMDB_READ_ACCESS_TOKEN` is missing or TMDB responds non-2xx.
 */
export async function fetchTmdbList(
  path: string,
  page = 1,
): Promise<TmdbListResponse> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_READ_ACCESS_TOKEN is not set. Add it to .env.local.");
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("page", String(page));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as TmdbListResponse;
}

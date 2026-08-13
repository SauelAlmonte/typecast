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

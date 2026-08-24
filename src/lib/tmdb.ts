import { cache } from "react";

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
  genre_ids?: number[];
  // Person-list entries only (/person/popular).
  known_for_department?: string;
  profile_path?: string | null;
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
  // Credit endpoints only; the sync's people rows want both.
  known_for_department?: string;
  popularity?: number;
};
export type TmdbCrewMember = {
  id: number;
  name: string;
  job?: string;
  department?: string;
  profile_path?: string | null;
  known_for_department?: string;
  popularity?: number;
};

/** The /credits sub-resource, fetched standalone by the sync. */
export type TmdbCredits = {
  cast?: TmdbCastMember[];
  crew?: TmdbCrewMember[];
};
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

/**
 * A person detail response with combined credits appended. Credit
 * entries are the same endpoint-dependent list-item shape the media
 * lists use, so `TmdbListItem` covers them.
 */
export type TmdbPersonDetail = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string;
  profile_path?: string | null;
  combined_credits?: { cast?: TmdbListItem[] };
};

/** One TMDB request covers everything a title page shows. */
const DETAIL_APPEND = {
  movie: "credits,videos,recommendations,keywords,release_dates,images",
  tv: "credits,videos,recommendations,keywords,content_ratings,images",
} as const;

/** Details drift about as fast as the catalog: a day of cache is fine. */
const DETAIL_REVALIDATE_S = 86_400;

/** How long a render waits on TMDB before failing the page. */
const TMDB_TIMEOUT_MS = 10_000;

/** Parallel TMDB requests per process. Build workers multiply this:
 * global concurrency is workers × this cap, tuned together with the
 * staticGeneration settings in next.config.ts to stay under TMDB's
 * ~50 req/s ceiling during a full prerender. */
const TMDB_MAX_CONCURRENT = 2;

/** Retries after the first attempt, for 429, 5xx, and network errors.
 * Exhausting them throws, which fails the page and with it the build:
 * a loudly failed build leaves the previous deploy serving, while a
 * degraded page would sit broken and public until the next deploy. */
const TMDB_RETRIES = 3;

/**
 * Bounds the render's wait, not the request: passing an AbortSignal
 * would opt the fetch out of Next's per-render memoization, and both
 * detail fetchers run twice per render (generateMetadata plus the
 * page) sharing one TMDB request only through it. A raced-out request
 * keeps running and settles into the data cache; the render errors
 * instead of hanging to the platform timeout.
 */
async function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(`TMDB timed out after ${TMDB_TIMEOUT_MS}ms on ${what}`),
        ),
      TMDB_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/* A hand-rolled counting semaphore. Single-threaded JS makes the
 * bookkeeping race-free; release() hands its slot straight to the next
 * waiter so the in-flight count never overshoots the cap. */
let inFlight = 0;
const waiters: (() => void)[] = [];

function acquire(): Promise<void> {
  if (inFlight < TMDB_MAX_CONCURRENT) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}

function release(): void {
  const next = waiters.shift();
  if (next) {
    next(); // The slot transfers; inFlight stays counted.
  } else {
    inFlight--;
  }
}

/** With TMDB_LOG_TIMING set, one line per request start and finish,
 * timestamped, so a build log can be swept for observed concurrency
 * and request rate across all worker processes. */
function logTiming(phase: "start" | "done", what: string): void {
  if (process.env.TMDB_LOG_TIMING) {
    console.log(`[tmdb] ${Date.now()} ${phase} ${what}`);
  }
}

/**
 * The one path every TMDB request takes: token auth, the render
 * timeout, the per-process concurrency cap, and retry with backoff.
 *
 * 429 and 5xx responses and thrown fetch errors retry up to
 * {@link TMDB_RETRIES} times, honoring a numeric `Retry-After` and
 * otherwise backing off exponentially (1s, 2s, 4s) with jitter.
 * Anything else — 404 included — returns to the caller untouched.
 *
 * @param url - Full request URL.
 * @param init - Extra fetch options (e.g. Next data-cache settings);
 *   auth headers are added here.
 * @param what - Short request label for errors and timing logs.
 * @returns The first non-retryable response.
 * @throws When the token is missing, or retries are exhausted.
 */
export async function tmdbRequest(
  url: URL | string,
  init: RequestInit & { next?: { revalidate?: number } },
  what: string,
): Promise<Response> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_READ_ACCESS_TOKEN is not set. Add it to .env.local.");
  }

  await acquire();
  try {
    let lastError: unknown;
    for (let attempt = 0; attempt <= TMDB_RETRIES; attempt++) {
      if (attempt > 0) {
        const retryAfter = Number(
          lastError instanceof Response
            ? lastError.headers.get("retry-after")
            : Number.NaN,
        );
        const delayMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2 ** (attempt - 1) * 1000 + Math.random() * 250;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      logTiming("start", what);
      try {
        const res = await withTimeout(
          fetch(url, {
            ...init,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }),
          what,
        );
        if (res.status === 429 || res.status >= 500) {
          lastError = res;
          continue;
        }
        return res;
      } catch (error) {
        lastError = error;
      } finally {
        logTiming("done", what);
      }
    }
    if (lastError instanceof Response) {
      throw new Error(
        `TMDB ${lastError.status} on ${what} after ${TMDB_RETRIES} retries`,
      );
    }
    throw lastError;
  } finally {
    release();
  }
}

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
/* cache() dedupes the generateMetadata + page pair within one render.
 * Measured before it existed: static generation made two real network
 * calls per page (4,639 for 2,322 pages, build of 2026-08-24) — the
 * fetch memoization the runtime relies on does not carry across the
 * build's metadata and page passes. Outside React (the sync scripts),
 * cache() runs the function directly, so nothing changes there. */
export const fetchTmdbDetail = cache(async function fetchTmdbDetail(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<TmdbTitleDetail | null> {
  const url = new URL(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}`);
  url.searchParams.set("append_to_response", DETAIL_APPEND[mediaType]);
  // Without this, appended images are filtered to the request language
  // and the textless backdrops (iso_639_1 null) never arrive.
  url.searchParams.set("include_image_language", "null,en");

  const res = await tmdbRequest(
    url,
    { next: { revalidate: DETAIL_REVALIDATE_S } },
    `/${mediaType}/${tmdbId}`,
  );

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
});

/**
 * Fetch one person's detail record with combined credits appended, so
 * the person page costs a single TMDB request. Cached in the framework
 * data cache for a day per URL, the title page's reasoning.
 *
 * @param tmdbId - TMDB's person id, the one our catalog stores as `tmdb_id`.
 * @returns The decoded detail, or null when TMDB has no such person, so
 *   the page can 404 instead of 500.
 * @throws When the token is missing or TMDB fails with anything but 404.
 */
export const fetchTmdbPerson = cache(async function fetchTmdbPerson(
  tmdbId: number,
): Promise<TmdbPersonDetail | null> {
  const url = new URL(`${TMDB_BASE_URL}/person/${tmdbId}`);
  url.searchParams.set("append_to_response", "combined_credits");

  const res = await tmdbRequest(
    url,
    { next: { revalidate: DETAIL_REVALIDATE_S } },
    `/person/${tmdbId}`,
  );

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TMDB ${res.status} on /person/${tmdbId}: ${body.slice(0, 200)}`,
    );
  }

  return (await res.json()) as TmdbPersonDetail;
});

/**
 * Fetch one title's cast and crew alone, without the full detail
 * append. The sync's people pass wants exactly this and nothing else,
 * so the payload stays a tenth of the detail response. Uncached: the
 * sync runs outside Next, where the data cache doesn't exist.
 *
 * @param mediaType - Which TMDB namespace the id lives in.
 * @param tmdbId - TMDB's own id for the title.
 * @returns The credits, or null when TMDB has no such title.
 * @throws When the token is missing or TMDB fails with anything but 404.
 */
export async function fetchTmdbCredits(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<TmdbCredits | null> {
  const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/credits`;
  const res = await tmdbRequest(url, {}, `/${mediaType}/${tmdbId}/credits`);

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TMDB ${res.status} on /${mediaType}/${tmdbId}/credits: ${body.slice(0, 200)}`,
    );
  }

  return (await res.json()) as TmdbCredits;
}

/**
 * Fetch one scope's genre vocabulary (id → name pairs). The two scopes
 * share one id space, so callers can merge the lists by id.
 *
 * @param mediaType - Which vocabulary: `/genre/movie/list` or `/genre/tv/list`.
 * @returns The scope's genres.
 * @throws When `TMDB_READ_ACCESS_TOKEN` is missing or TMDB responds non-2xx.
 */
export async function fetchTmdbGenres(
  mediaType: "movie" | "tv",
): Promise<TmdbGenre[]> {
  const res = await tmdbRequest(
    `${TMDB_BASE_URL}/genre/${mediaType}/list`,
    {},
    `/genre/${mediaType}/list`,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `TMDB ${res.status} on /genre/${mediaType}/list: ${body.slice(0, 200)}`,
    );
  }

  const { genres } = (await res.json()) as { genres: TmdbGenre[] };
  return genres;
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
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("page", String(page));

  const res = await tmdbRequest(url, {}, path);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as TmdbListResponse;
}

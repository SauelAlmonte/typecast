import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon/Icon";
import GenreRails from "@/components/Rails/GenreRails/GenreRails";
import SearchBox from "@/components/SearchBox/SearchBox";
import {
  type GenreRail,
  genreRails,
  type MediaKind,
  type PersonCard,
  popularPeople,
  searchMedia,
} from "@/db/queries";

/** w342 fills the widest grid cell this layout produces. */
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/** w185 covers the card width at 2x device pixel ratio (CastRail's
 * reasoning; profile stills are 2:3 like posters). */
const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

const RESULTS_LIMIT = 24;

/** The whole synced popular-people list; the sync caps it, not the page. */
const PEOPLE_LIMIT = 60;

type SearchParams = { [key: string]: string | string[] | undefined };

/** One param as a single trimmed string, whatever the URL carried. */
function readParam(params: SearchParams, name: string): string {
  const raw = params[name];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

/** The nav's type filter; anything unrecognized reads as no filter.
 * person browses the synced people list; award is a nav destination
 * without catalog data yet, so it renders an honest placeholder. */
type NavKind = MediaKind | "person" | "award";

function readKind(params: SearchParams): NavKind | undefined {
  const raw = readParam(params, "type");
  return raw === "movie" || raw === "tv" || raw === "person" || raw === "award"
    ? raw
    : undefined;
}

const KIND_TITLE = {
  movie: "Movies",
  tv: "TV Shows",
  person: "People",
  award: "Awards",
};

export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const params = await searchParams;
  const q = readParam(params, "q");
  const kind = readKind(params);
  if (q) return { title: `Search: ${q}` };
  return { title: kind ? KIND_TITLE[kind] : "Search" };
}

/**
 * Search results and the nav's browse pages in one route. Reading
 * `searchParams` makes it render per request, so the catalog query
 * never runs at build time. Flows:
 * - `q` alone: ranked matches across the whole catalog.
 * - `q` with `type`: the same ranking scoped to movies or TV.
 * - `type` alone: that kind's genre rails, the Movies and TV Shows
 *   nav destinations.
 * - `type=person` alone: the synced people list, popularity order.
 *   People aren't searchable yet, so `q` with person says so.
 * - `type=award`: an honest empty state; no data source yet.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const q = readParam(params, "q");
  const kind = readKind(params);
  const scope = kind === "movie" || kind === "tv" ? kind : undefined;
  const placeholder = kind === "person" || kind === "award";

  let results: Awaited<ReturnType<typeof searchMedia>> = [];
  let rails: GenreRail[] = [];
  let people: PersonCard[] = [];
  if (kind === "person") {
    if (q === "") {
      people = await popularPeople(PEOPLE_LIMIT);
    }
  } else if (!placeholder) {
    if (q !== "") {
      results = await searchMedia(q, RESULTS_LIMIT, scope);
    } else if (scope) {
      rails = await genreRails(scope);
    }
  }

  let heading = "Search";
  if (q !== "") {
    heading = `Results for “${q}”`;
  } else if (kind) {
    heading = KIND_TITLE[kind];
  }

  return (
    <div className="tc-container tc-results">
      <SearchBox />
      <h1 className="tc-h2">{heading}</h1>
      {kind === "award" && (
        <p className="tc-results-empty">
          Awards aren’t in the catalog yet; movies and TV shows are searchable
          today.
        </p>
      )}
      {kind === "person" && q !== "" && (
        <p className="tc-results-empty">
          People aren’t searchable yet; movies and TV shows are. Open People
          from the nav to browse them.
        </p>
      )}
      {kind === "person" && q === "" && people.length === 0 && (
        <p className="tc-results-empty">
          Nothing to browse yet; the catalog is still filling in.
        </p>
      )}
      {people.length > 0 && (
        // biome-ignore lint/a11y/noRedundantRoles: list-style:none strips list semantics in Safari/VoiceOver; the explicit role restores them (1.3.1).
        <ul className="tc-results-grid" role="list">
          {people.map((person) => (
            <li className="tc-result-card" key={person.id}>
              <Link
                className="tc-result-card-link"
                href={`/person/${person.tmdbId}`}
              >
                {person.profilePath ? (
                  <Image
                    alt=""
                    className="tc-result-card-poster"
                    height={278}
                    src={`${PROFILE_BASE}${person.profilePath}`}
                    width={185}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="tc-result-card-poster tc-result-card-poster--empty"
                  >
                    <Icon name="image" />
                    <span className="tc-meta">No image</span>
                  </span>
                )}
                <span className="tc-ui tc-result-card-title">
                  {person.name}
                </span>
                {person.knownForDepartment && (
                  <span className="tc-meta tc-result-card-meta">
                    {person.knownForDepartment}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!placeholder && q === "" && !scope && (
        <p className="tc-results-empty">
          Type a title in the search box to search the catalog.
        </p>
      )}
      {!placeholder && q !== "" && results.length === 0 && (
        <p className="tc-results-empty">
          No matches for &ldquo;{q}&rdquo;. Try a shorter fragment.
        </p>
      )}
      {!placeholder && q === "" && scope && rails.length === 0 && (
        <p className="tc-results-empty">
          Nothing to browse yet; the catalog is still filling in.
        </p>
      )}
      {rails.length > 0 && <GenreRails rails={rails} />}
      {results.length > 0 && (
        // biome-ignore lint/a11y/noRedundantRoles: list-style:none strips list semantics in Safari/VoiceOver; the explicit role restores them (1.3.1).
        <ul className="tc-results-grid" role="list">
          {results.map((r) => (
            <li className="tc-result-card" key={`${r.mediaType}-${r.id}`}>
              <Link
                className="tc-result-card-link"
                href={`/title/${r.mediaType}/${r.tmdbId}`}
              >
                {r.posterPath ? (
                  <Image
                    alt=""
                    className="tc-result-card-poster"
                    height={278}
                    src={`${POSTER_BASE}${r.posterPath}`}
                    width={185}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="tc-result-card-poster tc-result-card-poster--empty"
                  >
                    <Icon name="image" />
                    <span className="tc-meta">No image</span>
                  </span>
                )}
                <span className="tc-ui tc-result-card-title">{r.title}</span>
                <span className="tc-meta tc-result-card-meta">
                  {r.mediaType === "tv" ? "TV" : "Movie"}
                  {r.year ? ` · ${r.year}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

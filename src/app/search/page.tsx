import type { Metadata } from "next";
import Image from "next/image";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import IconSprite from "@/components/IconSprite";
import SearchBox from "@/components/SearchBox";
import { type MediaKind, popularMedia, searchMedia } from "@/db/queries";

/** w342 fills the widest grid cell this layout produces. */
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

const RESULTS_LIMIT = 24;

type SearchParams = { [key: string]: string | string[] | undefined };

/** One param as a single trimmed string, whatever the URL carried. */
function readParam(params: SearchParams, name: string): string {
  const raw = params[name];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

/** The nav's type filter; anything unrecognized reads as no filter. */
function readKind(params: SearchParams): MediaKind | "person" | undefined {
  const raw = readParam(params, "type");
  return raw === "movie" || raw === "tv" || raw === "person" ? raw : undefined;
}

const KIND_TITLE = { movie: "Movies", tv: "TV Shows", person: "People" };

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
 * - `type` alone: that kind's most popular titles, the Movies and
 *   TV Shows nav destinations.
 * - `type=person`: an honest empty state; people aren't synced yet.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const q = readParam(params, "q");
  const kind = readKind(params);
  const scope = kind === "person" ? undefined : kind;

  let results: Awaited<ReturnType<typeof searchMedia>> = [];
  if (kind !== "person") {
    if (q !== "") {
      results = await searchMedia(q, RESULTS_LIMIT, scope);
    } else if (scope) {
      results = await popularMedia(scope, RESULTS_LIMIT);
    }
  }

  let heading = "Search";
  if (q !== "") {
    heading = `Results for “${q}”`;
  } else if (kind) {
    heading = KIND_TITLE[kind];
  }

  return (
    <>
      <a className="tc-skip-link" href="#main">
        Skip to content
      </a>
      <IconSprite />
      <Header />
      <main id="main" tabIndex={-1}>
        <div className="tc-container-wide tc-results">
          <SearchBox />
          <h1 className="tc-h2">{heading}</h1>
          {kind === "person" && (
            <p className="tc-results-empty">
              People aren&rsquo;t in the catalog yet; movies and TV shows are
              searchable today.
            </p>
          )}
          {kind !== "person" && q === "" && !scope && (
            <p className="tc-results-empty">
              Type a title above to search the catalog.
            </p>
          )}
          {kind !== "person" && q !== "" && results.length === 0 && (
            <p className="tc-results-empty">
              No matches for &ldquo;{q}&rdquo;. Try a shorter fragment.
            </p>
          )}
          {results.length > 0 && (
            <ul className="tc-results-grid">
              {results.map((r) => (
                <li className="tc-result-card" key={`${r.mediaType}-${r.id}`}>
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
                      className="tc-result-card-poster"
                    />
                  )}
                  <span className="tc-ui tc-result-card-title">{r.title}</span>
                  <span className="tc-meta tc-result-card-meta">
                    {r.mediaType === "tv" ? "TV" : "Movie"}
                    {r.year ? ` · ${r.year}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

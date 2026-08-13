import type { Metadata } from "next";
import Image from "next/image";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import IconSprite from "@/components/IconSprite";
import SearchBox from "@/components/SearchBox";
import { searchMedia } from "@/db/queries";

/** w342 fills the widest grid cell this layout produces. */
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

const RESULTS_LIMIT = 24;

/** The `q` param as a single trimmed string, whatever the URL carried. */
function readQuery(params: { [key: string]: string | string[] | undefined }) {
  const raw = params.q;
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const q = readQuery(await searchParams);
  return { title: q ? `Search: ${q}` : "Search" };
}

/**
 * Full results for a submitted search. Reading `searchParams` makes this
 * page render per request, so the catalog query never runs at build time.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const q = readQuery(await searchParams);
  const results = q === "" ? [] : await searchMedia(q, RESULTS_LIMIT);

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
          <h1 className="tc-h2">
            {q === "" ? "Search" : <>Results for &ldquo;{q}&rdquo;</>}
          </h1>
          {q === "" && (
            <p className="tc-results-empty">
              Type a title above to search the catalog.
            </p>
          )}
          {q !== "" && results.length === 0 && (
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

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { RailItem } from "@/app/api/rails/route";
import Icon from "@/components/Icon/Icon";
import CastRail, { type CastCard } from "@/components/Rails/CastRail/CastRail";
import MediaRail from "@/components/Rails/MediaRail/MediaRail";
import TrailerDialog from "@/components/TrailerDialog/TrailerDialog";
import { fetchTmdbDetail, type TmdbTitleDetail } from "@/lib/tmdb";

/** w1280 backdrop fills the hero band; w500 covers the poster at 2x. */
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

/** Mirrors the backdrop box in title.css: a full-width strip in compact
 * bands; from 64rem the box rides the band height at 16:9. The band is
 * its content until the 37.5vw floor overtakes it (~1700px here, the
 * title content being taller than the landing copy), where the box
 * lands at ~67vw. 100vw stays the safe ceiling below that. Must change
 * with the CSS or the browser fetches the wrong srcset width. */
const BACKDROP_SIZES = "(min-width: 120rem) 67vw, 100vw";

const CAST_MAX = 12;
const RECOMMENDATIONS_MAX = 12;
const KEYWORDS_MAX = 12;

/** Em dashes are legal break points, so TMDB prose can strand one at
 * a line's end. Word joiners (U+2060) glue the dash to both neighbors
 * and the trio wraps as one word; the visible text is unchanged. */
function glueEmDashes(text: string): string {
  return text.replaceAll("\u{2014}", "\u{2060}\u{2014}\u{2060}");
}

/** The route only speaks TMDB's two scripted kinds; anything else 404s. */
function readKind(type: string): "movie" | "tv" {
  if (type !== "movie" && type !== "tv") notFound();
  return type;
}

/** TMDB ids are positive ints; anything else 404s before touching TMDB. */
function readTmdbId(id: string): number {
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  return Number(id);
}

function displayTitle(detail: TmdbTitleDetail): string {
  return detail.title ?? detail.name ?? "Untitled";
}

function releaseYear(detail: TmdbTitleDetail): string | null {
  const date = detail.release_date ?? detail.first_air_date;
  return date ? date.slice(0, 4) : null;
}

/** US certification: movies bury it in release_dates, TV in content_ratings. */
function certification(detail: TmdbTitleDetail): string | null {
  const movieCert = detail.release_dates?.results
    ?.find((r) => r.iso_3166_1 === "US")
    ?.release_dates?.find((d) => d.certification)?.certification;
  const tvCert = detail.content_ratings?.results?.find(
    (r) => r.iso_3166_1 === "US",
  )?.rating;
  return movieCert || tvCert || null;
}

/** "2h 6m" from TMDB's runtime minutes; TV omits runtime entirely. */
function formatRuntime(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "en" reads as "English"; an unknown code falls back to itself. */
function languageName(code: string | undefined): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** The people the hero credits: director(s) for film, creator(s) for TV. */
function makers(
  detail: TmdbTitleDetail,
  kind: "movie" | "tv",
): { names: string[]; role: string } | null {
  const names =
    kind === "movie"
      ? (detail.credits?.crew ?? [])
          .filter((c) => c.job === "Director")
          .map((c) => c.name)
      : (detail.created_by ?? []).map((c) => c.name);
  if (names.length === 0) return null;
  return {
    names: names.slice(0, 2),
    role: kind === "movie" ? "Director" : "Creator",
  };
}

/**
 * The backdrop worth a full-width band. TMDB's detail default is the
 * highest vote average, which lets a 6-vote crop beat a 38-vote scene
 * shot; consensus (vote count) across the textless backdrops picks the
 * art people actually chose. Falls back to the default.
 */
function pickBackdrop(detail: TmdbTitleDetail): string | null {
  const voted = (detail.images?.backdrops ?? [])
    .filter((b) => b.iso_639_1 == null)
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  return voted[0]?.file_path ?? detail.backdrop_path ?? null;
}

/** Best YouTube video: an official trailer, any trailer, then a teaser. */
function pickTrailer(detail: TmdbTitleDetail): string | null {
  const videos = (detail.videos?.results ?? []).filter(
    (v) => v.site === "YouTube",
  );
  const pick =
    videos.find((v) => v.type === "Trailer" && v.official) ??
    videos.find((v) => v.type === "Trailer") ??
    videos.find((v) => v.type === "Teaser");
  return pick?.key ?? null;
}

/** The latest real season: specials (season 0) never headline. */
function currentSeason(detail: TmdbTitleDetail) {
  const seasons = (detail.seasons ?? []).filter((s) => s.season_number > 0);
  return seasons.at(-1) ?? null;
}

/** Recommendations reshaped into rail cards so MediaRail renders them
 * unchanged; TMDB recommendation ids ARE tmdb ids, so both id fields
 * carry the same value. */
function recommendationItems(detail: TmdbTitleDetail): RailItem[] {
  return (detail.recommendations?.results ?? [])
    .filter(
      (r) =>
        (r.media_type === "movie" || r.media_type === "tv") && r.poster_path,
    )
    .slice(0, RECOMMENDATIONS_MAX)
    .map((r) => ({
      id: r.id,
      tmdbId: r.id,
      mediaType: r.media_type as string,
      title: r.title ?? r.name ?? "Untitled",
      year: (() => {
        const date = r.release_date ?? r.first_air_date;
        return date ? Number(date.slice(0, 4)) : null;
      })(),
      posterPath: r.poster_path as string,
    }));
}

export async function generateMetadata({
  params,
}: PageProps<"/title/[type]/[id]">): Promise<Metadata> {
  const { type, id } = await params;
  const detail = await fetchTmdbDetail(readKind(type), readTmdbId(id));
  if (!detail) return { title: "Not found" };
  const year = releaseYear(detail);
  return {
    title: year ? `${displayTitle(detail)} (${year})` : displayTitle(detail),
    description: detail.overview || undefined,
    openGraph: (() => {
      const backdrop = pickBackdrop(detail);
      return backdrop ? { images: [`${BACKDROP_BASE}${backdrop}`] } : undefined;
    })(),
  };
}

/**
 * One title's detail page, the destination behind every poster and
 * suggestion. A single TMDB request (sub-resources appended, cached a
 * day) feeds the hero, cast, season, facts, and recommendations.
 */
export default async function TitlePage({
  params,
}: PageProps<"/title/[type]/[id]">) {
  const { type, id } = await params;
  const kind = readKind(type);
  const detail = await fetchTmdbDetail(kind, readTmdbId(id));
  if (!detail) notFound();

  const title = displayTitle(detail);
  const backdropPath = pickBackdrop(detail);
  const year = releaseYear(detail);
  const cert = certification(detail);
  const runtime = kind === "movie" ? formatRuntime(detail.runtime) : null;
  const genres = (detail.genres ?? []).map((g) => g.name);
  const score =
    typeof detail.vote_average === "number" && detail.vote_average > 0
      ? Math.round(detail.vote_average * 10)
      : null;
  const credit = makers(detail, kind);
  const trailerKey = pickTrailer(detail);
  const cast: CastCard[] = (detail.credits?.cast ?? [])
    .slice(0, CAST_MAX)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? null,
      profilePath: c.profile_path ?? null,
    }));
  const season = kind === "tv" ? currentSeason(detail) : null;
  const recommendations = recommendationItems(detail);
  const keywords = (detail.keywords?.keywords ?? detail.keywords?.results ?? [])
    .slice(0, KEYWORDS_MAX)
    .map((k) => k.name);
  const language = languageName(detail.original_language);
  const company =
    kind === "tv"
      ? detail.networks?.[0]?.name
      : detail.production_companies?.[0]?.name;

  return (
    <article>
      <section aria-labelledby="tc-title-heading" className="tc-title-hero">
        {backdropPath && (
          <div aria-hidden="true" className="tc-title-backdrop">
            <Image
              alt=""
              className="tc-title-backdrop-img"
              fill
              preload
              sizes={BACKDROP_SIZES}
              src={`${BACKDROP_BASE}${backdropPath}`}
            />
            <div className="tc-title-scrim" />
          </div>
        )}
        <div className="tc-container tc-title-hero-inner">
          {detail.poster_path ? (
            <Image
              alt={`${title} poster`}
              className="tc-title-poster"
              height={513}
              loading="eager"
              src={`${POSTER_BASE}${detail.poster_path}`}
              width={342}
            />
          ) : (
            <span
              aria-hidden="true"
              className="tc-title-poster tc-title-poster--empty"
            >
              <Icon name="image" />
              <span className="tc-meta">No image</span>
            </span>
          )}
          {/* The headline rides beside the poster at every width
                  above the phone stack; the about block joins it there
                  only on wide screens and drops below on tablets. The
                  grid areas in title.css do the moving. */}
          <div className="tc-title-headline">
            <h1 className="tc-h2" id="tc-title-heading">
              {title}
              {year && <span className="tc-title-year"> ({year})</span>}
            </h1>
            {(cert || genres.length > 0 || runtime) && (
              <p className="tc-ui tc-title-meta">
                {cert && <span className="tc-title-cert">{cert}</span>}
                {genres.length > 0 && <span>{genres.join(", ")}</span>}
                {runtime && <span>{runtime}</span>}
              </p>
            )}
            {(score !== null || trailerKey) && (
              <div className="tc-title-actions">
                {score !== null && (
                  <p className="tc-title-score">
                    <strong className="tc-h3">{score}%</strong> User score
                  </p>
                )}
                {trailerKey && (
                  <TrailerDialog title={title} videoKey={trailerKey} />
                )}
              </div>
            )}
            {detail.tagline && (
              <p className="tc-title-tagline">{glueEmDashes(detail.tagline)}</p>
            )}
          </div>
          {(detail.overview || credit) && (
            <div className="tc-title-about">
              {detail.overview && (
                <>
                  <h2 className="tc-h3">Overview</h2>
                  <p className="tc-title-overview">
                    {glueEmDashes(detail.overview)}
                  </p>
                </>
              )}
              {credit && (
                <p className="tc-title-makers">
                  <span className="tc-ui">{credit.names.join(", ")}</span>
                  <span className="tc-meta tc-title-makers-role">
                    {credit.role}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      <div className="tc-container tc-title-body">
        <div className="tc-title-main">
          <CastRail
            cast={cast}
            title={kind === "tv" ? "Series Cast" : "Top Billed Cast"}
          />
          {season && (
            <section
              aria-labelledby="tc-title-season-heading"
              className="tc-title-season"
            >
              <h2 className="tc-h3" id="tc-title-season-heading">
                Current Season
              </h2>
              <div className="tc-title-season-card">
                {season.poster_path ? (
                  <Image
                    alt=""
                    className="tc-title-season-poster"
                    height={278}
                    src={`${POSTER_BASE}${season.poster_path}`}
                    width={185}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="tc-title-season-poster tc-title-season-poster--empty"
                  >
                    <Icon name="image" />
                    <span className="tc-meta">No image</span>
                  </span>
                )}
                <div className="tc-title-season-text">
                  <h3 className="tc-h3">{season.name}</h3>
                  {(season.air_date || season.episode_count) && (
                    <p className="tc-meta">
                      {season.air_date ? season.air_date.slice(0, 4) : null}
                      {season.air_date && season.episode_count ? " · " : null}
                      {season.episode_count
                        ? `${season.episode_count} episodes`
                        : null}
                    </p>
                  )}
                  {/* TMDB leaves many season overviews empty; an
                          honest line beats a hollow card. */}
                  <p className="tc-title-season-overview">
                    {season.overview || "No overview yet."}
                  </p>
                </div>
              </div>
            </section>
          )}
          {recommendations.length > 0 && (
            <MediaRail
              items={recommendations}
              title={`If you liked ${title}`}
            />
          )}
        </div>
        <aside aria-label="Facts" className="tc-title-aside">
          <h2 className="tc-h3">Facts</h2>
          <dl className="tc-title-facts">
            {detail.status && (
              <>
                <dt className="tc-meta">Status</dt>
                <dd className="tc-ui">{detail.status}</dd>
              </>
            )}
            <dt className="tc-meta">Type</dt>
            <dd className="tc-ui">{kind === "tv" ? "TV Series" : "Movie"}</dd>
            {language && (
              <>
                <dt className="tc-meta">Original Language</dt>
                <dd className="tc-ui">{language}</dd>
              </>
            )}
            {company && (
              <>
                <dt className="tc-meta">
                  {kind === "tv" ? "Network" : "Studio"}
                </dt>
                <dd className="tc-ui">{company}</dd>
              </>
            )}
          </dl>
          {keywords.length > 0 && (
            <>
              <h3 className="tc-meta tc-title-keywords-heading">Keywords</h3>
              {/* biome-ignore lint/a11y/noRedundantRoles: list-style:none strips list semantics in Safari/VoiceOver; the explicit role restores them (1.3.1). */}
              <ul className="tc-title-keywords" role="list">
                {keywords.map((word) => (
                  <li className="tc-meta tc-title-keyword" key={word}>
                    {word}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { RailItem } from "@/app/api/rails/route";
import Icon from "@/components/Icon/Icon";
import MediaRail from "@/components/Rails/MediaRail/MediaRail";
import { fetchTmdbPerson, type TmdbPersonDetail } from "@/lib/tmdb";

/** h632 is TMDB's large profile bucket; profiles have no w500. */
const PORTRAIT_BASE = "https://image.tmdb.org/t/p/h632";

const KNOWN_FOR_MAX = 12;

/** TMDB ids are positive ints; anything else 404s before touching TMDB. */
function readTmdbId(id: string): number {
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  return Number(id);
}

/**
 * TMDB copies Wikipedia openers wholesale, IPA pronunciation included:
 * "Jason Statham (/ˈsteɪθəm/ STAY-thəm; born 26 July 1967)". The
 * notation means nothing here, so a parenthetical opening with "/" is
 * trimmed to its first ";" (keeping "(born ...)"), and one that is
 * pronunciation alone is removed outright.
 */
function stripPronunciation(text: string): string {
  return text.replace(/\(\/[^)]*?;\s*/g, "(").replace(/\(\/[^)]*\)\s*/g, "");
}

/** "June 22, 1949" from TMDB's ISO date; bad input falls back as-is. */
function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The credits worth a rail: acting credits reshaped into rail cards so
 * MediaRail renders them unchanged. A person appears once per credit in
 * combined_credits, so the same title repeats across TV episodes and
 * jobs; the Map dedupes by (kind, id) before ranking by popularity.
 */
function knownForItems(detail: TmdbPersonDetail): RailItem[] {
  const byTitle = new Map<string, RailItem & { popularity: number }>();
  for (const credit of detail.combined_credits?.cast ?? []) {
    const kind = credit.media_type;
    if ((kind !== "movie" && kind !== "tv") || !credit.poster_path) continue;
    const key = `${kind}-${credit.id}`;
    if (byTitle.has(key)) continue;
    const date = credit.release_date ?? credit.first_air_date;
    byTitle.set(key, {
      id: credit.id,
      tmdbId: credit.id,
      mediaType: kind,
      title: credit.title ?? credit.name ?? "Untitled",
      year: date ? Number(date.slice(0, 4)) : null,
      posterPath: credit.poster_path,
      popularity: credit.popularity ?? 0,
    });
  }
  return [...byTitle.values()]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, KNOWN_FOR_MAX)
    .map(({ popularity: _, ...item }) => item);
}

export async function generateMetadata({
  params,
}: PageProps<"/person/[id]">): Promise<Metadata> {
  const { id } = await params;
  const detail = await fetchTmdbPerson(readTmdbId(id));
  if (!detail) return { title: "Not found" };
  return {
    title: detail.name,
    description:
      stripPronunciation(detail.biography ?? "").slice(0, 160) || undefined,
  };
}

/**
 * One person's detail page, the destination behind every people-grid
 * card. A single TMDB request (combined credits appended, cached a
 * day) feeds the portrait, the facts, the biography, and the
 * known-for rail — the title page's shape, one column simpler.
 */
export default async function PersonPage({
  params,
}: PageProps<"/person/[id]">) {
  const { id } = await params;
  const detail = await fetchTmdbPerson(readTmdbId(id));
  if (!detail) notFound();

  const knownFor = knownForItems(detail);
  // TMDB pads absent biographies with "" and absent dates with null;
  // each fact renders only when it exists (honest empty states).
  const paragraphs = stripPronunciation(detail.biography ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  // The first paragraph opens in the hero beside the portrait; the
  // rest read full-width below it.
  const [lead, ...rest] = paragraphs;

  return (
    <div className="tc-container tc-person">
      {detail.profile_path ? (
        <Image
          alt={`Portrait of ${detail.name}`}
          className="tc-person__portrait"
          height={632}
          src={`${PORTRAIT_BASE}${detail.profile_path}`}
          width={421}
        />
      ) : (
        <span
          aria-hidden="true"
          className="tc-person__portrait tc-person__portrait--empty"
        >
          <Icon name="image" />
          <span className="tc-meta">No image</span>
        </span>
      )}
      <div className="tc-person__intro">
        <h1 className="tc-h1">{detail.name}</h1>
        {detail.known_for_department && (
          <p className="tc-meta tc-meta-caps tc-person__department">
            {detail.known_for_department}
          </p>
        )}
        <dl className="tc-person__facts">
          {detail.birthday && (
            <div className="tc-person__fact">
              <dt className="tc-meta tc-person__fact-name">Born</dt>
              <dd className="tc-ui">{formatDate(detail.birthday)}</dd>
            </div>
          )}
          {detail.deathday && (
            <div className="tc-person__fact">
              <dt className="tc-meta tc-person__fact-name">Died</dt>
              <dd className="tc-ui">{formatDate(detail.deathday)}</dd>
            </div>
          )}
          {detail.place_of_birth && (
            <div className="tc-person__fact">
              <dt className="tc-meta tc-person__fact-name">Birthplace</dt>
              <dd className="tc-ui">{detail.place_of_birth}</dd>
            </div>
          )}
        </dl>
      </div>
      {lead && <p className="tc-person__lead">{lead}</p>}
      {rest.length > 0 && (
        <section aria-label="Biography" className="tc-person__bio">
          {rest.map((p) => (
            <p className="tc-person__bio-text" key={p.slice(0, 40)}>
              {p}
            </p>
          ))}
        </section>
      )}
      {knownFor.length > 0 && (
        <div className="tc-person__rail">
          <MediaRail items={knownFor} title="Known For" />
        </div>
      )}
    </div>
  );
}

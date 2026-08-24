"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef } from "react";
import Icon from "@/components/Icon/Icon";

/** w185 covers the card width at 2x device pixel ratio. */
const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

export type CastCard = {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
  /** Whether this person has a page. The person route is bounded to
   * the people table, so linking anyone else would be a dead 404. */
  linked: boolean;
};

type CastRailProps = {
  title: string;
  cast: CastCard[];
};

/**
 * Top-billed cast as a horizontal rail. Shares the carousel classes
 * with MediaRail (profile stills are 2:3 like posters). Cards for
 * people in the database link to their page — TMDB cast ids ARE
 * person ids, the namespace the /person route speaks — and the rest
 * render as plain cards: billing is factual content, so nobody is
 * dropped just because no page exists yet.
 */
export default function CastRail({ title, cast }: CastRailProps) {
  const track = useRef<HTMLUListElement>(null);
  const headingId = useId();

  /** Page the track by most of a viewport; honors reduced motion. */
  function page(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const instant = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.9,
      behavior: instant ? "auto" : "smooth",
    });
  }

  if (cast.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className="tc-carousel">
      <div className="tc-carousel__head">
        <h2 className="tc-h3 tc-carousel__heading" id={headingId}>
          {title}
        </h2>
        <div className="tc-carousel__nav">
          <button
            aria-label={`Scroll ${title} back`}
            className="tc-carousel__arrow"
            onClick={() => page(-1)}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            aria-label={`Scroll ${title} forward`}
            className="tc-carousel__arrow"
            onClick={() => page(1)}
            type="button"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
      {/* biome-ignore lint/a11y/noRedundantRoles: list-style:none strips list semantics in Safari/VoiceOver; the explicit role restores them (1.3.1). */}
      <ul className="tc-carousel__track" ref={track} role="list">
        {cast.map((person) => {
          const card = (
            <>
              {person.profilePath ? (
                <Image
                  alt=""
                  className="tc-carousel__poster"
                  height={278}
                  src={`${PROFILE_BASE}${person.profilePath}`}
                  width={185}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="tc-carousel__poster tc-carousel__poster--empty"
                >
                  <Icon name="image" />
                  <span className="tc-meta">No image</span>
                </span>
              )}
              <span className="tc-ui tc-carousel__title">{person.name}</span>
              {person.character && (
                <span className="tc-meta tc-carousel__meta">
                  {person.character}
                </span>
              )}
            </>
          );
          return (
            <li className="tc-carousel__card" key={person.id}>
              {person.linked ? (
                <Link
                  className="tc-carousel__card-link"
                  href={`/person/${person.id}`}
                >
                  {card}
                </Link>
              ) : (
                // Same class, same layout; not an anchor, so the global
                // link hover never fakes clickability.
                <span className="tc-carousel__card-link">{card}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

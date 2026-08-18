"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import Icon from "@/components/Icon/Icon";

/** w185 covers the card width at 2x device pixel ratio. */
const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

export type CastCard = {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
};

type CastRailProps = {
  title: string;
  cast: CastCard[];
};

/**
 * Top-billed cast as a horizontal rail. Shares the carousel classes
 * with MediaRail (profile stills are 2:3 like posters), but the cards
 * are people, not links: person pages aren't in the catalog yet, and a
 * card that goes nowhere shouldn't dress like one that does.
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
        <h2 className="tc-h3" id={headingId}>
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
        {cast.map((person) => (
          <li className="tc-carousel__card" key={person.id}>
            {person.profilePath ? (
              <Image
                alt=""
                className="tc-carousel__poster"
                height={278}
                src={`${PROFILE_BASE}${person.profilePath}`}
                width={185}
              />
            ) : (
              <span aria-hidden="true" className="tc-carousel__poster" />
            )}
            <span className="tc-ui tc-carousel__title">{person.name}</span>
            {person.character && (
              <span className="tc-meta tc-carousel__meta">
                {person.character}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

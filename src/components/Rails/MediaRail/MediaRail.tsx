"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef } from "react";
import type { RailItem } from "@/app/api/rails/route";
import Icon from "@/components/Icon/Icon";

/** w342 covers the card width at 2x device pixel ratio. */
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/** Stable keys for the loading placeholders; index keys trip lint. */
const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

type MediaRailProps = {
  title: string;
  /** null renders skeleton cards while the payload loads. */
  items: RailItem[] | null;
};

/**
 * One horizontal category rail, hand-rolled: a snap-scrolling track of
 * poster cards paged by arrow buttons. Purely presentational; the
 * data arrives via props so every rail on the page shares one fetch.
 */
export default function MediaRail({ title, items }: MediaRailProps) {
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

  if (items !== null && items.length === 0) {
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
        {items === null
          ? SKELETON_KEYS.map((key) => (
              <li aria-hidden="true" className="tc-carousel__card" key={key}>
                <span className="tc-carousel__poster" />
              </li>
            ))
          : items.map((item) => (
              <li
                className="tc-carousel__card"
                key={`${item.mediaType}-${item.id}`}
              >
                <Link
                  className="tc-carousel__card-link"
                  href={`/title/${item.mediaType}/${item.tmdbId}`}
                >
                  {/* sizes mirrors the card widths in carousel.css so
                      phones fetch a small TMDB bucket, not w500. */}
                  <Image
                    alt=""
                    className="tc-carousel__poster"
                    height={278}
                    sizes="(max-width: 48rem) 7.5rem, 9.5rem"
                    src={`${POSTER_BASE}${item.posterPath}`}
                    width={185}
                  />
                  <span className="tc-ui tc-carousel__title">{item.title}</span>
                  <span className="tc-meta tc-carousel__meta">
                    {item.mediaType === "tv" ? "TV" : "Movie"}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

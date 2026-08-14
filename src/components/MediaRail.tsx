"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import type { RailItem } from "@/app/api/rails/route";
import Icon from "@/components/Icon";

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
      <div className="tc-carousel-head">
        <h2 className="tc-h3" id={headingId}>
          {title}
        </h2>
        <div className="tc-carousel-nav">
          <button
            aria-label={`Scroll ${title} back`}
            className="tc-carousel-arrow"
            onClick={() => page(-1)}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            aria-label={`Scroll ${title} forward`}
            className="tc-carousel-arrow"
            onClick={() => page(1)}
            type="button"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
      <ul className="tc-carousel-track" ref={track}>
        {items === null
          ? SKELETON_KEYS.map((key) => (
              <li aria-hidden="true" className="tc-carousel-card" key={key}>
                <span className="tc-carousel-poster" />
              </li>
            ))
          : items.map((item) => (
              <li
                className="tc-carousel-card"
                key={`${item.mediaType}-${item.id}`}
              >
                <Image
                  alt=""
                  className="tc-carousel-poster"
                  height={278}
                  src={`${POSTER_BASE}${item.posterPath}`}
                  width={185}
                />
                <span className="tc-ui tc-carousel-title">{item.title}</span>
                <span className="tc-meta tc-carousel-meta">
                  {item.mediaType === "tv" ? "TV" : "Movie"}
                  {item.year ? ` · ${item.year}` : ""}
                </span>
              </li>
            ))}
      </ul>
    </section>
  );
}

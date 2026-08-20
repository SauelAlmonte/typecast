"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon/Icon";
import type { UpcomingItem } from "@/db/queries";

/** w1280 is TMDB's largest sized backdrop; the hero box renders it at
 * its own 16:9 in every band, so there is no portrait variant. */
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

/** Mirrors the backdrop box in hero-backdrop.css. The band is
 * content-sized (landing-hero.css), so 100vw is the safe ceiling;
 * past 90rem the band's 37.5vw floor governs and the 16:9 box lands
 * at ~67vw. Must change with the CSS or the browser fetches the
 * wrong srcset width. */
const BACKDROP_SIZES = "(min-width: 90rem) 67vw, 100vw";

/** How long each featured title holds the background. */
const ROTATE_MS = 5_000;

/** The rotation stays at six titles so the dot row stays readable;
 * the rail below the hero shows the endpoint's full list. */
const ROTATION_MAX = 6;

type HeroBackdropProps = {
  /** Server-fetched so the first slide ships in the initial HTML. */
  items: UpcomingItem[];
};

/**
 * Prime-style rotating hero background: one latest-or-upcoming backdrop
 * fills the section, crossfades to the next every ROTATE_MS, and dots
 * let the viewer jump the rotation (which also restarts the timer).
 *
 * Three layers render at a time: the previous image stays underneath
 * while the current one fades in over it, and the next one sits at
 * opacity 0 purely so the browser fetches it before its turn. The
 * backdrop is decorative, so an empty list renders nothing and the
 * hero falls back to the plain canvas.
 */
export default function HeroBackdrop({ items: allItems }: HeroBackdropProps) {
  const items = allItems.slice(0, ROTATION_MAX);
  const [index, setIndex] = useState(0);
  // The 2.2.2 stop control's state; dots stay usable while paused.
  const [paused, setPaused] = useState(false);

  function artSrc(item: UpcomingItem): string {
    return `${BACKDROP_BASE}${item.backdropPath}`;
  }

  // One timeout per shown title instead of an interval: every index
  // change re-arms it, so a manual dot pick gets its full stay too.
  // Reduced motion stops the automatic swap entirely, not just the
  // fade; the dots keep manual rotation available.
  useEffect(() => {
    if (paused || items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => {
      setIndex((index + 1) % items.length);
    }, ROTATE_MS);
    return () => clearTimeout(id);
  }, [index, items.length, paused]);

  if (items.length === 0) {
    return null;
  }

  const n = items.length;
  const current = items[index];
  const previous = items[(index - 1 + n) % n];
  const next = items[(index + 1) % n];

  return (
    <>
      <div aria-hidden="true" className="tc-hero-backdrop">
        {/* Visible at first paint beneath the current layer's 900ms fade,
            so this IS the LCP image; eager stops the lazy default and
            fetchPriority wins the race among the three mounted layers. */}
        <div className="tc-hero-backdrop__layer" key={`p-${previous.id}`}>
          <Image
            alt=""
            className="tc-hero-backdrop__img"
            fetchPriority="high"
            fill
            loading="eager"
            sizes={BACKDROP_SIZES}
            src={artSrc(previous)}
          />
        </div>
        {/* The key remounts this layer per title, restarting the fade. */}
        <div
          className="tc-hero-backdrop__layer tc-hero-backdrop__layer--current"
          key={`c-${current.id}`}
        >
          {/* Not the preload prop: the keyed remount would inject a head
              preload link per rotated title. */}
          <Image
            alt=""
            className="tc-hero-backdrop__img"
            fetchPriority="high"
            fill
            loading="eager"
            sizes={BACKDROP_SIZES}
            src={artSrc(current)}
          />
        </div>
        {n > 2 && (
          <div
            className="tc-hero-backdrop__layer tc-hero-backdrop__layer--hidden"
            key={`n-${next.id}`}
          >
            <Image
              alt=""
              className="tc-hero-backdrop__img"
              fill
              sizes={BACKDROP_SIZES}
              src={artSrc(next)}
            />
          </div>
        )}
        <div className="tc-hero-backdrop__scrim" />
      </div>
      <p className="tc-meta tc-hero-backdrop__featured">
        Featured: {current.title}
        {current.year ? ` (${current.year})` : ""}
      </p>
      {n > 1 && (
        <div className="tc-hero-backdrop__dots">
          {/* Auto-updating content needs a stop control (WCAG 2.2.2). */}
          <button
            aria-label={
              paused
                ? "Resume the featured rotation"
                : "Pause the featured rotation"
            }
            className="tc-hero-backdrop__pause"
            onClick={() => setPaused(!paused)}
            type="button"
          >
            <Icon name={paused ? "play" : "pause"} size="sm" />
          </button>
          {items.map((item, i) => (
            <button
              aria-current={i === index || undefined}
              aria-label={`Show ${item.title}`}
              className={
                i === index
                  ? "tc-hero-backdrop__dot tc-hero-backdrop__dot--active"
                  : "tc-hero-backdrop__dot"
              }
              key={`${item.mediaType}-${item.id}`}
              onClick={() => setIndex(i)}
              type="button"
            >
              <span className="tc-hero-backdrop__dot-mark" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

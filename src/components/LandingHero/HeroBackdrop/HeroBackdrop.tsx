"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { UpcomingItem } from "@/app/api/upcoming/route";

/** w1280 is TMDB's largest sized backdrop; the hero box renders it at
 * its own 16:9 in every band, so there is no portrait variant. */
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

/** Mirrors the backdrop box in hero-backdrop.css: a full-width strip in compact
 * bands; from 64rem the box rides the band height (100svh minus the
 * header) at 16:9, capped at the viewport. Must change with the CSS or
 * the browser fetches the wrong srcset width. */
const BACKDROP_SIZES =
  "(min-width: 64rem) min(calc((100svh - 5rem) * 16 / 9), 100vw), 100vw";

/** How long each featured title holds the background. */
const ROTATE_MS = 5_000;

/** The rotation stays at six titles so the dot row stays readable;
 * the rail below the hero shows the endpoint's full list. */
const ROTATION_MAX = 6;

/**
 * Prime-style rotating hero background: one latest-or-upcoming backdrop
 * fills the section, crossfades to the next every ROTATE_MS, and dots
 * let the viewer jump the rotation (which also restarts the timer).
 *
 * Three layers render at a time: the previous image stays underneath
 * while the current one fades in over it, and the next one sits at
 * opacity 0 purely so the browser fetches it before its turn. The
 * backdrop is decorative, so a failed fetch renders nothing and the
 * hero falls back to the plain themed canvas.
 */
export default function HeroBackdrop() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [index, setIndex] = useState(0);

  function artSrc(item: UpcomingItem): string {
    return `${BACKDROP_BASE}${item.backdropPath}`;
  }

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/upcoming", {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`upcoming request failed: ${res.status}`);
        }
        const data: UpcomingItem[] = await res.json();
        setItems(data.slice(0, ROTATION_MAX));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(error);
      }
    })();
    return () => controller.abort();
  }, []);

  // One timeout per shown title instead of an interval: every index
  // change re-arms it, so a manual dot pick gets its full stay too.
  // Reduced motion stops the automatic swap entirely, not just the
  // fade; the dots keep manual rotation available.
  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => {
      setIndex((index + 1) % items.length);
    }, ROTATE_MS);
    return () => clearTimeout(id);
  }, [index, items.length]);

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
            so it can be the LCP image; eager stops the lazy default. The
            current layer alone adds fetchPriority: it wins the race among
            the three concurrently mounted layers. */}
        <div className="tc-hero-backdrop__layer" key={`p-${previous.id}`}>
          <Image
            alt=""
            className="tc-hero-backdrop__img"
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
          {/* Not the deprecated priority or its successor preload: a head
              preload link can't get ahead of a client-fetched src, and the
              keyed remount would inject one per rotated title. */}
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

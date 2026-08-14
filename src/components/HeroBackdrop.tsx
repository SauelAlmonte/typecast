"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { UpcomingItem } from "@/app/api/upcoming/route";

/** w1280 is TMDB's largest sized backdrop; the hero fills the viewport. */
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

/** Portrait viewports get the portrait art instead; w780 covers phones. */
const POSTER_BASE = "https://image.tmdb.org/t/p/w780";

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
  // Art direction, not scaling: a widescreen backdrop cropped into a
  // tall viewport loses its subject, so portrait screens swap to the
  // portrait poster, which is composed for exactly that shape.
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      "(orientation: portrait) and (max-width: 36rem)",
    );
    setIsPortrait(query.matches);
    const onChange = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function artSrc(item: UpcomingItem): string {
    return isPortrait
      ? `${POSTER_BASE}${item.posterPath}`
      : `${BACKDROP_BASE}${item.backdropPath}`;
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
        <div className="tc-hero-layer" key={`p-${previous.id}`}>
          <Image
            alt=""
            className="tc-hero-layer-img"
            fill
            sizes="100vw"
            src={artSrc(previous)}
          />
        </div>
        {/* The key remounts this layer per title, restarting the fade. */}
        <div
          className="tc-hero-layer tc-hero-layer-current"
          key={`c-${current.id}`}
        >
          <Image
            alt=""
            className="tc-hero-layer-img"
            fill
            priority
            sizes="100vw"
            src={artSrc(current)}
          />
        </div>
        {n > 2 && (
          <div
            className="tc-hero-layer tc-hero-layer-hidden"
            key={`n-${next.id}`}
          >
            <Image
              alt=""
              className="tc-hero-layer-img"
              fill
              sizes="100vw"
              src={artSrc(next)}
            />
          </div>
        )}
        <div className="tc-hero-scrim" />
      </div>
      <p className="tc-meta tc-hero-featured">
        Featured: {current.title}
        {current.year ? ` (${current.year})` : ""}
      </p>
      {n > 1 && (
        <div className="tc-hero-dots">
          {items.map((item, i) => (
            <button
              aria-current={i === index || undefined}
              aria-label={`Show ${item.title}`}
              className={
                i === index ? "tc-hero-dot tc-hero-dot-active" : "tc-hero-dot"
              }
              key={`${item.mediaType}-${item.id}`}
              onClick={() => setIndex(i)}
              type="button"
            >
              <span className="tc-hero-dot-mark" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

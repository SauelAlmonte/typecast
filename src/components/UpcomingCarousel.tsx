"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { UpcomingItem } from "@/app/api/upcoming/route";
import Icon from "@/components/Icon";

/** w342 covers the card width at 2x device pixel ratio. */
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/** Stable keys for the loading placeholders; index keys trip lint. */
const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

/**
 * Netflix-style rail of the latest and upcoming titles, hand-rolled:
 * a horizontally scrollable snap track plus arrow buttons that page it.
 * The rail is decorative garnish under the hero copy, so a failed fetch
 * collapses it instead of breaking the page.
 */
export default function UpcomingCarousel() {
  // null means loading; [] means failed or empty, which hides the rail.
  const [items, setItems] = useState<UpcomingItem[] | null>(null);
  const track = useRef<HTMLUListElement>(null);

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
        setItems(await res.json());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(error);
        setItems([]);
      }
    })();
    return () => controller.abort();
  }, []);

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
    <section
      aria-labelledby="tc-upcoming-title"
      className="tc-container-wide tc-carousel"
    >
      <div className="tc-carousel-head">
        <h2 className="tc-h3" id="tc-upcoming-title">
          Latest and upcoming
        </h2>
        <div className="tc-carousel-nav">
          <button
            aria-label="Scroll back"
            className="tc-carousel-arrow"
            onClick={() => page(-1)}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            aria-label="Scroll forward"
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

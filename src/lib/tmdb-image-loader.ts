"use client";

import type { ImageLoaderProps } from "next/image";

/* Serves TMDB art straight from TMDB's CDN instead of Vercel's image
   optimizer, whose free-tier quota returns 402 once spent. TMDB already
   stores every image pre-sized, so the optimizer added nothing. */

const TMDB_BASE = "https://image.tmdb.org/t/p/";

/* The CDN's resize whitelist; shared across posters, backdrops, and
   profiles (verified against both file types). */
const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280];

export default function tmdbImageLoader({ src, width }: ImageLoaderProps) {
  if (!src.startsWith(TMDB_BASE)) return src;

  const file = src.slice(TMDB_BASE.length).split("/")[1];
  if (!file) return src;

  /* Smallest size that still covers the request. Capped at w1280, the
     ceiling the site already shipped: `original` can be a multi-MB scan. */
  const size = TMDB_WIDTHS.find((w) => w >= width) ?? 1280;
  return `${TMDB_BASE}w${size}/${file}`;
}

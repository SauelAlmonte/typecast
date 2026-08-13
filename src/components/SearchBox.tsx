"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { SuggestResult } from "@/app/api/suggest/route";
import Icon from "@/components/Icon";

import { normalizeSearchText } from "@/lib/normalize";

const CACHE_MAX = 50;

/** w92 is TMDB's smallest poster rendition, plenty for a 40px thumb. */
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

/** How long typing must pause before a request fires. */
const DEBOUNCE_MS = 200;

/**
 * Search-as-you-type input. Step 2: debounced. The input updates on every
 * keystroke, but the fetch waits for a typing pause; each keystroke kills
 * the previous pending timer, so only the last one in a burst survives.
 * Still to come: cancellation, cache, keyboard, ARIA.
 */
export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, SuggestResult[]>());

  async function fetchSuggestions(key: string) {
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(key)}`, {
        signal: controller.current.signal,
      });
      const data: SuggestResult[] = await res.json();
      cache.current.set(key, data);
      if (cache.current.size > CACHE_MAX) {
        const oldest = cache.current.keys().next().value;
        if (oldest !== undefined) {
          cache.current.delete(oldest);
        }
      }
      setResults(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const key = normalizeSearchText(value);
    if (key === "") {
      setResults([]);
      return;
    }
    const cached = cache.current.get(key);
    if (cached) {
      setResults(cached);
      return;
    }
    timer.current = setTimeout(() => fetchSuggestions(key), DEBOUNCE_MS);
  }

  return (
    <div className="tc-search-field">
      <label className="tc-visually-hidden" htmlFor="tc-search">
        Search movies
      </label>
      <Icon className="tc-search-icon" name="search" size="sm" />
      <input
        autoComplete="off"
        className="tc-search-input"
        id="tc-search"
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search titles, people, studios…"
        spellCheck={false}
        type="text"
        value={query}
      />
      {results.length > 0 && (
        <ul className="tc-search-panel tc-result-list">
          {results.map((r) => (
            <li className="tc-result-row" key={`${r.mediaType}-${r.id}`}>
              {r.posterPath ? (
                <Image
                  alt=""
                  className="tc-result-thumb"
                  height={60}
                  src={`${TMDB_IMAGE_BASE}${r.posterPath}`}
                  width={40}
                />
              ) : (
                <span aria-hidden="true" className="tc-result-thumb" />
              )}
              <span className="tc-result-text">
                <span className="tc-result-title">{r.title}</span>
                {r.year && (
                  <span className="tc-result-hint">Release Date: {r.year}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

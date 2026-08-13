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

const LISTBOX_ID = "tc-search-listbox";

function optionId(r: SuggestResult): string {
  return `tc-option-${r.mediaType}-${r.id}`;
}

/**
 * Search-as-you-type combobox. The efficiency stack is hand-built and
 * layered: a trailing debounce collapses keystroke bursts to one request
 * per pause, AbortController kills superseded requests so stale responses
 * never paint, and a size-capped Map keyed by the normalized query serves
 * repeats and backspaces synchronously. Keyboard and screen-reader
 * behavior follow the WAI-ARIA combobox pattern: focus stays in the
 * input while aria-activedescendant points at the highlighted option.
 */
export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, SuggestResult[]>());

  function showResults(data: SuggestResult[]) {
    setResults(data);
    setIsOpen(data.length > 0);
    setActiveIndex(-1);
  }

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
      showResults(data);
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
      showResults([]);
      return;
    }
    const cached = cache.current.get(key);
    if (cached) {
      showResults(cached);
      return;
    }
    timer.current = setTimeout(() => fetchSuggestions(key), DEBOUNCE_MS);
  }

  function selectResult(r: SuggestResult) {
    setQuery(r.title);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      // Closed panel: ArrowDown reopens the current results, per the
      // ARIA combobox pattern.
      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        // preventDefault stops the caret jumping to the line ends.
        e.preventDefault();
        setActiveIndex((activeIndex + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(activeIndex <= 0 ? results.length - 1 : activeIndex - 1);
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          selectResult(results[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const activeOption = isOpen && activeIndex >= 0 ? results[activeIndex] : null;

  return (
    <div className="tc-search-field">
      <label className="tc-visually-hidden" htmlFor="tc-search">
        Search movies
      </label>
      <Icon className="tc-search-icon" name="search" size="sm" />
      <input
        aria-activedescendant={
          activeOption ? optionId(activeOption) : undefined
        }
        aria-autocomplete="list"
        aria-controls={LISTBOX_ID}
        aria-expanded={isOpen}
        autoComplete="off"
        className="tc-search-input"
        id="tc-search"
        onBlur={() => setIsOpen(false)}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsOpen(results.length > 0)}
        onKeyDown={handleKeyDown}
        placeholder="Search titles, people, studios…"
        role="combobox"
        spellCheck={false}
        type="text"
        value={query}
      />
      <span aria-live="polite" className="tc-visually-hidden">
        {isOpen ? `${results.length} suggestions available` : ""}
      </span>
      {isOpen && (
        // Divs, not ul/li: the ARIA combobox pattern keeps focus in the
        // input and marks the highlighted option via aria-activedescendant,
        // so options are deliberately not tab-focusable. Roles replace the
        // tags' native semantics for assistive tech, and neutral divs are
        // the form Biome's a11y rules accept for that pattern.
        <div
          aria-label="Suggestions"
          className="tc-search-panel tc-result-list"
          id={LISTBOX_ID}
          role="listbox"
        >
          {results.map((r, index) => (
            <div
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? "tc-result-row tc-result-row-active"
                  : "tc-result-row"
              }
              id={optionId(r)}
              key={`${r.mediaType}-${r.id}`}
              onMouseDown={(e) => {
                // mousedown fires before the input's blur, so selection
                // beats the blur-close; preventDefault keeps focus in
                // the input afterwards.
                e.preventDefault();
                selectResult(r);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              tabIndex={-1}
            >
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

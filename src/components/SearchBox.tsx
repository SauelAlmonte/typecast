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

/** localStorage key for recent searches; purely client-side, capped. */
const RECENTS_KEY = "tc-recent-searches";
const RECENTS_MAX = 10;

function resultOptionId(r: SuggestResult): string {
  return `tc-option-${r.mediaType}-${r.id}`;
}

function recentOptionId(index: number): string {
  return `tc-option-recent-${index}`;
}

/**
 * Read recent searches from localStorage, defensively: storage can be
 * absent (private mode) and its content can be garbage. Either case
 * degrades to an empty list, never an error.
 */
function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Search-as-you-type combobox. The efficiency stack is hand-built and
 * layered: a trailing debounce collapses keystroke bursts to one request
 * per pause, AbortController kills superseded requests so stale responses
 * never paint, and a size-capped Map keyed by the normalized query serves
 * repeats and backspaces synchronously. Keyboard and screen-reader
 * behavior follow the WAI-ARIA combobox pattern: focus stays in the
 * input while aria-activedescendant points at the highlighted option.
 * An empty focused field offers recent selections from localStorage.
 */
export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestResult[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, SuggestResult[]>());
  /** The normalized query the current `results` answer; guards reopening. */
  const lastKey = useRef<string | null>(null);

  const showingRecents = normalizeSearchText(query) === "";
  const optionCount = showingRecents ? recents.length : results.length;

  function showResults(key: string, data: SuggestResult[]) {
    lastKey.current = key;
    setResults(data);
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function openRecents() {
    const stored = loadRecents();
    setRecents(stored);
    setIsOpen(stored.length > 0);
    setActiveIndex(-1);
  }

  function closePanel() {
    setIsOpen(false);
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
      showResults(key, data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }

  function runSearch(key: string) {
    const cached = cache.current.get(key);
    if (cached) {
      showResults(key, cached);
      return;
    }
    timer.current = setTimeout(() => fetchSuggestions(key), DEBOUNCE_MS);
  }

  function handleChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const key = normalizeSearchText(value);
    if (key === "") {
      setResults([]);
      lastKey.current = null;
      openRecents();
      return;
    }
    runSearch(key);
  }

  function saveRecent(title: string) {
    try {
      const next = [title, ...loadRecents().filter((t) => t !== title)].slice(
        0,
        RECENTS_MAX,
      );
      setRecents(next);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // Storage being unavailable only costs the convenience feature.
    }
  }

  function selectResult(r: SuggestResult) {
    setQuery(r.title);
    saveRecent(r.title);
    closePanel();
  }

  function selectRecent(title: string) {
    setQuery(title);
    if (timer.current) clearTimeout(timer.current);
    runSearch(normalizeSearchText(title));
  }

  function selectByIndex(index: number) {
    if (showingRecents) {
      const title = recents[index];
      if (title !== undefined) selectRecent(title);
    } else {
      const r = results[index];
      if (r !== undefined) selectResult(r);
    }
  }

  function handleFocus() {
    const key = normalizeSearchText(query);
    if (key === "") {
      openRecents();
    } else if (lastKey.current === key) {
      setIsOpen(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === "ArrowDown" && optionCount > 0) {
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
        if (optionCount > 0) {
          setActiveIndex((activeIndex + 1) % optionCount);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (optionCount > 0) {
          setActiveIndex(activeIndex <= 0 ? optionCount - 1 : activeIndex - 1);
        }
        break;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          selectByIndex(activeIndex);
        }
        break;
      case "Escape":
        closePanel();
        break;
    }
  }

  const showEmptyState = isOpen && !showingRecents && results.length === 0;
  const activeId =
    isOpen && activeIndex >= 0
      ? showingRecents
        ? recentOptionId(activeIndex)
        : results[activeIndex] && resultOptionId(results[activeIndex])
      : undefined;

  let liveMessage = "";
  if (isOpen) {
    liveMessage =
      optionCount > 0
        ? `${optionCount} ${showingRecents ? "recent searches" : "suggestions"} available`
        : "No matches";
  }

  return (
    <div className="tc-search-field">
      <label className="tc-visually-hidden" htmlFor="tc-search">
        Search movies
      </label>
      <Icon className="tc-search-icon" name="search" size="sm" />
      <input
        aria-activedescendant={activeId || undefined}
        aria-autocomplete="list"
        aria-controls={LISTBOX_ID}
        aria-expanded={isOpen}
        autoComplete="off"
        className="tc-search-input"
        id="tc-search"
        onBlur={closePanel}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search titles, people, studios…"
        role="combobox"
        spellCheck={false}
        type="text"
        value={query}
      />
      <span aria-live="polite" className="tc-visually-hidden">
        {liveMessage}
      </span>
      {isOpen && showEmptyState && (
        <div className="tc-search-panel tc-search-empty">
          No matches for “{query.trim()}”
        </div>
      )}
      {isOpen && !showEmptyState && (
        <div
          aria-label={showingRecents ? "Recent searches" : "Suggestions"}
          className="tc-search-panel tc-result-list"
          id={LISTBOX_ID}
          role="listbox"
        >
          {showingRecents && (
            <div aria-hidden="true" className="tc-search-heading">
              Recent searches
            </div>
          )}
          {showingRecents
            ? recents.map((title, index) => (
                <div
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "tc-result-row tc-result-row-active"
                      : "tc-result-row"
                  }
                  id={recentOptionId(index)}
                  key={title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectRecent(title);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  tabIndex={-1}
                >
                  <Icon
                    className="tc-result-recent-icon"
                    name="search"
                    size="sm"
                  />
                  <span className="tc-result-title">{title}</span>
                </div>
              ))
            : results.map((r, index) => (
                <div
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "tc-result-row tc-result-row-active"
                      : "tc-result-row"
                  }
                  id={resultOptionId(r)}
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
                      <span className="tc-result-hint">
                        Release Date: {r.year}
                      </span>
                    )}
                  </span>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}

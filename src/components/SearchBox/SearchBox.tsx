"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SuggestResult } from "@/app/api/suggest/route";
import Icon from "@/components/Icon/Icon";
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
  const router = useRouter();
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

  const queryKey = normalizeSearchText(query);
  const showingRecents = queryKey === "";
  const optionCount = showingRecents ? recents.length : results.length;
  /** Whether `results` answer the query as it reads now. Stale results
   * may stay visible mid-typing, but never reopen or read as empty. */
  const resultsAreCurrent = lastKey.current === queryKey;

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

  /** Stop both pending kinds of work: the armed timer and the live request. */
  function cancelPending() {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    controller.current = null;
  }

  function closePanel() {
    cancelPending();
    setIsOpen(false);
    setActiveIndex(-1);
  }

  async function fetchSuggestions(key: string) {
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(key)}`, {
        signal: requestController.signal,
      });
      const data: SuggestResult[] = await res.json();
      // The response is valid data for its key even if the user has moved
      // on, so it may enter the cache; it may not touch the screen unless
      // this request is still the current one.
      cache.current.set(key, data);
      if (cache.current.size > CACHE_MAX) {
        const oldest = cache.current.keys().next().value;
        if (oldest !== undefined) {
          cache.current.delete(oldest);
        }
      }
      if (
        requestController.signal.aborted ||
        controller.current !== requestController
      ) {
        return;
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
    // Every keystroke invalidates whatever the previous keystroke started,
    // in-flight requests included; aborting only when the next fetch began
    // left a window where a stale response could repaint the panel.
    cancelPending();
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

  /**
   * Leave the combobox for the full results page. Fired by the
   * magnifying-glass button and by Enter with no suggestion highlighted,
   * so a typed fragment like "spi" still goes somewhere useful.
   */
  function submitSearch() {
    const trimmed = query.trim();
    if (normalizeSearchText(trimmed) === "") return;
    saveRecent(trimmed);
    closePanel();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  /** Picking a suggestion goes straight to its title page; the query
   * still lands in the box and the recents so Back feels continuous. */
  function selectResult(r: SuggestResult) {
    setQuery(r.title);
    saveRecent(r.title);
    closePanel();
    router.push(`/title/${r.mediaType}/${r.tmdbId}`);
  }

  function selectRecent(title: string) {
    setQuery(title);
    cancelPending();
    const key = normalizeSearchText(title);
    const cached = cache.current.get(key);
    if (cached) {
      showResults(key, cached);
      return;
    }
    // A pick is a discrete event: no debounce, and the panel hides
    // until this key's results exist, so the empty state can't flash
    // a false "No matches" while the request runs.
    setIsOpen(false);
    setActiveIndex(-1);
    // Unlike the debounced path there is no timer to swallow a failure,
    // so log-and-degrade here the way the rails and hero fetches do.
    fetchSuggestions(key).catch(console.error);
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
    // Never act on keys aimed at an IME composition: Enter commits the
    // composed text and the arrows steer the candidate list.
    if (e.nativeEvent.isComposing) return;
    if (!isOpen) {
      if (
        e.key === "ArrowDown" &&
        optionCount > 0 &&
        (showingRecents || resultsAreCurrent)
      ) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      } else if (e.key === "Enter") {
        submitSearch();
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
        e.preventDefault();
        if (activeIndex >= 0) {
          selectByIndex(activeIndex);
        } else {
          submitSearch();
        }
        break;
      case "Escape":
        closePanel();
        break;
    }
  }

  const showEmptyState =
    isOpen && !showingRecents && resultsAreCurrent && results.length === 0;
  /* The popup exists only when it has something to show, and the ARIA
   * expanded/controls pair reflects exactly that. */
  const panelVisible = isOpen && (showEmptyState || optionCount > 0);
  const activeId =
    panelVisible && activeIndex >= 0
      ? showingRecents
        ? recentOptionId(activeIndex)
        : results[activeIndex] && resultOptionId(results[activeIndex])
      : undefined;

  // Counts only: the empty panel is its own status region, so a live
  // "No matches" here would announce twice.
  let liveMessage = "";
  if (panelVisible && optionCount > 0) {
    liveMessage = `${optionCount} ${showingRecents ? "recent searches" : "suggestions"} available`;
  }

  return (
    <div className="tc-search-box">
      <label className="tc-visually-hidden" htmlFor="tc-search">
        Search movies
      </label>
      {/* mousedown preventDefault keeps focus in the input, so the
          panel's blur-close never races the click. */}
      <button
        aria-label="Search"
        className="tc-search-box__submit"
        onClick={submitSearch}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <Icon name="search" size="sm" />
      </button>
      <input
        aria-activedescendant={activeId || undefined}
        aria-autocomplete="list"
        aria-controls={panelVisible && !showEmptyState ? LISTBOX_ID : undefined}
        aria-expanded={panelVisible}
        autoComplete="off"
        className="tc-search-box__input"
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
      {showEmptyState && (
        <div
          className="tc-search-box__panel tc-search-box__panel--empty"
          role="status"
        >
          No matches for “{query.trim()}”
        </div>
      )}
      {panelVisible && !showEmptyState && (
        <div
          aria-label={showingRecents ? "Recent searches" : "Suggestions"}
          className="tc-search-box__panel"
          id={LISTBOX_ID}
          role="listbox"
        >
          {showingRecents && (
            <div aria-hidden="true" className="tc-search-box__heading">
              Recent searches
            </div>
          )}
          {showingRecents
            ? recents.map((title, index) => (
                <div
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "tc-search-box__option tc-search-box__option--active"
                      : "tc-search-box__option"
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
                    className="tc-search-box__recent-icon"
                    name="search"
                    size="sm"
                  />
                  <span className="tc-search-box__title">{title}</span>
                </div>
              ))
            : results.map((r, index) => (
                <div
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "tc-search-box__option tc-search-box__option--active"
                      : "tc-search-box__option"
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
                      className="tc-search-box__thumb"
                      height={60}
                      src={`${TMDB_IMAGE_BASE}${r.posterPath}`}
                      width={40}
                    />
                  ) : (
                    <span aria-hidden="true" className="tc-search-box__thumb" />
                  )}
                  <span className="tc-search-box__text">
                    <span className="tc-search-box__title">{r.title}</span>
                    {r.year && (
                      <span className="tc-search-box__hint">
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

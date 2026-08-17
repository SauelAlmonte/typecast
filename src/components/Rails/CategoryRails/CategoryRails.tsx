"use client";

import { useEffect, useState } from "react";
import type { Rail } from "@/app/api/rails/route";
import MediaRail from "@/components/Rails/MediaRail/MediaRail";

/**
 * The stack of TMDB category rails under the hero, Prime-row style.
 * One fetch feeds every rail. The rails are below-the-fold garnish,
 * so a failed fetch collapses the stack instead of breaking the page.
 */
export default function CategoryRails() {
  // null means loading; [] means failed or empty, which hides the stack.
  const [rails, setRails] = useState<Rail[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/rails", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`rails request failed: ${res.status}`);
        }
        setRails(await res.json());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(error);
        setRails([]);
      }
    })();
    return () => controller.abort();
  }, []);

  if (rails !== null && rails.length === 0) {
    return null;
  }

  return (
    <div className="tc-container-wide tc-category-rails">
      {rails === null ? (
        <>
          <MediaRail items={null} title="Popular Movies" />
          <MediaRail items={null} title="Popular TV Shows" />
        </>
      ) : (
        rails.map((rail) => (
          <MediaRail items={rail.items} key={rail.slug} title={rail.title} />
        ))
      )}
    </div>
  );
}

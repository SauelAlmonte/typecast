import MediaRail from "@/components/Rails/MediaRail/MediaRail";
import type { Rail } from "@/db/queries";

type CategoryRailsProps = {
  rails: Rail[];
};

/**
 * The stack of TMDB category rails under the hero, Prime-row style.
 * Purely presentational: the landing page queries the rails during
 * its ISR render and passes them down, so a page view costs zero
 * function invocations — the client-side fetch this replaced billed
 * one per visitor. An empty payload collapses the stack; the rails
 * are below-the-fold garnish, never worth breaking the page over.
 */
export default function CategoryRails({ rails }: CategoryRailsProps) {
  if (rails.length === 0) {
    return null;
  }

  return (
    <div className="tc-container tc-category-rails">
      {rails.map((rail) => (
        <MediaRail items={rail.items} key={rail.slug} title={rail.title} />
      ))}
    </div>
  );
}

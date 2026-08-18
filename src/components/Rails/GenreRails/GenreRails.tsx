import MediaRail from "@/components/Rails/MediaRail/MediaRail";
import type { GenreRail } from "@/db/queries";

type GenreRailsProps = {
  rails: GenreRail[];
};

/**
 * The browse pages' rail stack: one carousel per genre, in the curated
 * order `genreRails()` returns. Purely presentational; the page fetches
 * so the stack renders on the server with no loading state.
 */
export default function GenreRails({ rails }: GenreRailsProps) {
  return (
    <div className="tc-genre-rails">
      {rails.map((rail) => (
        <MediaRail items={rail.titles} key={rail.genreId} title={rail.name} />
      ))}
    </div>
  );
}

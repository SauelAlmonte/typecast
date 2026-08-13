import SearchBox from "@/components/SearchBox";
import UpcomingCarousel from "@/components/UpcomingCarousel";

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="tc-section tc-hero">
      <div className="tc-container-content tc-hero-inner">
        <h1 className="tc-display" id="hero-title">
          Half a title is enough.
          <span aria-hidden="true" className="tc-caret" />
        </h1>
        <p className="tc-body-lg tc-hero-lede">
          TypeCast turns unfinished typing into the exact film. Suggestions
          settle as you pause, not on every keystroke.
        </p>
        <SearchBox />
      </div>
      <UpcomingCarousel />
    </section>
  );
}

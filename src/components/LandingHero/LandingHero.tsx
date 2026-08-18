import HeroBackdrop from "@/components/LandingHero/HeroBackdrop/HeroBackdrop";
import SearchBox from "@/components/SearchBox/SearchBox";

export default function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="tc-landing-hero">
      <div className="tc-landing-hero__band">
        <HeroBackdrop />
        <div className="tc-container tc-landing-hero__copy">
          <h1 className="tc-display" id="hero-title">
            Half a title is enough.
            <span aria-hidden="true" className="tc-caret" />
          </h1>
          <p className="tc-body-lg tc-landing-hero__lede">
            TypeCast turns unfinished typing into the exact film. Suggestions
            settle as you pause, not on every keystroke.
          </p>
          <SearchBox />
        </div>
      </div>
    </section>
  );
}

import HeroBackdrop from "@/components/LandingHero/HeroBackdrop/HeroBackdrop";
import SearchBox from "@/components/SearchBox/SearchBox";
import { type UpcomingItem, upcomingTitles } from "@/db/queries";

export default async function LandingHero() {
  /* Fetched server-side so the first backdrop sits in the initial HTML
     and the browser can start it immediately (it is the page's LCP).
     The art is decorative, so a failed query degrades to no backdrop
     rather than failing the page. */
  let items: UpcomingItem[] = [];
  try {
    items = await upcomingTitles();
  } catch (error) {
    console.error(error);
  }

  return (
    <section aria-labelledby="hero-title" className="tc-landing-hero">
      <div className="tc-landing-hero__band">
        {/* The frame owns the art crop (landing-hero.css) so the band
            never clips: the search panel hangs below the band's edge. */}
        <div className="tc-landing-hero__art">
          <HeroBackdrop items={items} />
        </div>
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

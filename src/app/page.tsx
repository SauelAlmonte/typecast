/* The hero's upcoming list is baked in at build; regenerate hourly so
   it tracks the daily sync without a per-request database round trip. */
export const revalidate = 3600;

import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import IconSprite from "@/components/Icon/IconSprite/IconSprite";
import LandingHero from "@/components/LandingHero/LandingHero";
import CategoryRails from "@/components/Rails/CategoryRails/CategoryRails";

export default function Home() {
  return (
    <>
      <a className="tc-skip-link" href="#main">
        Skip to content
      </a>
      <IconSprite />
      <Header />
      {/* tabIndex lets the skip link land focus here in every browser. */}
      <main id="main" tabIndex={-1}>
        <LandingHero />
        <CategoryRails />
      </main>
      <Footer />
    </>
  );
}

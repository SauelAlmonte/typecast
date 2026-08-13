import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import IconSprite from "@/components/IconSprite";
import Mechanics from "@/components/Mechanics";
import Narrative from "@/components/Narrative";
import ResultPreview from "@/components/ResultPreview";

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
        <Hero />
        <Narrative />
        <ResultPreview />
        <Mechanics />
      </main>
      <Footer />
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/** Past this many pixels of scroll the bar drops its transparency. */
const SOLID_AFTER_PX = 24;

/**
 * Fixed site bar. Over a live hero backdrop it starts see-through
 * (see header.css); once the page scrolls it turns solid again, so
 * the nav never fights the rail posters underneath for contrast.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "tc-header tc-header-scrolled" : "tc-header"}>
      <nav aria-label="Primary" className="tc-container-wide tc-header-nav">
        <span className="tc-wordmark tc-header-brand">TypeCast</span>
        <div className="tc-header-links">
          <Link className="tc-ui tc-header-link" href="/search?type=movie">
            Movies
          </Link>
          <Link className="tc-ui tc-header-link" href="/search?type=tv">
            TV Shows
          </Link>
          <Link className="tc-ui tc-header-link" href="/search?type=person">
            People
          </Link>
          <Link className="tc-ui tc-header-link" href="/search?type=award">
            Awards
          </Link>
        </div>
        <a
          className="tc-header-link"
          href="https://github.com/SauelAlmonte/typecast"
        >
          <Icon name="github" size="sm" />
          GitHub
        </a>
      </nav>
    </header>
  );
}

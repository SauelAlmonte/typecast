"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

/** Past this many pixels of scroll the bar drops its transparency. */
const SOLID_AFTER_PX = 24;

/** One source for both the inline links and the phone menu. */
const CATALOG_LINKS = [
  { href: "/search?type=movie", label: "Movies" },
  { href: "/search?type=tv", label: "TV Shows" },
  { href: "/search?type=person", label: "People" },
  { href: "/search?type=award", label: "Awards" },
] as const;

const GITHUB_URL = "https://github.com/SauelAlmonte/typecast";

/**
 * Fixed site bar. Over a live hero backdrop it starts see-through
 * (see header.css); once the page scrolls it turns solid again, so
 * the nav never fights the rail posters underneath for contrast.
 *
 * Below the tablet band the links collapse into a full-screen menu
 * behind a hamburger button. The menu is a native dialog: focus
 * trapping, Escape, and background inertness come from the platform
 * instead of hand-rolled listeners.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Growing the window past the breakpoint hides the hamburger, so the
  // menu must not be able to outlive its only opener.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 48rem)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) menuRef.current?.close();
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function openMenu() {
    menuRef.current?.showModal();
    setMenuOpen(true);
  }

  function closeMenu() {
    menuRef.current?.close();
  }

  return (
    <header className={scrolled ? "tc-header tc-header-scrolled" : "tc-header"}>
      <nav aria-label="Primary" className="tc-container-wide tc-header-nav">
        <Link className="tc-wordmark tc-header-brand" href="/">
          TypeCast
        </Link>
        <div className="tc-header-links">
          {CATALOG_LINKS.map((link) => (
            <Link
              className="tc-ui tc-header-link"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <a className="tc-header-link tc-header-github" href={GITHUB_URL}>
          <Icon name="github" size="sm" />
          GitHub
        </a>
        <button
          aria-controls="tc-nav-menu"
          aria-expanded={menuOpen}
          aria-label="Menu"
          className="tc-header-menu-button"
          onClick={openMenu}
          type="button"
        >
          <Icon name="menu" size="lg" />
        </button>
      </nav>
      {/* onClose fires for every close path (button, Escape, link), so
          aria-expanded can never drift from the dialog's real state. */}
      <dialog
        className="tc-nav-menu"
        id="tc-nav-menu"
        onClose={() => setMenuOpen(false)}
        ref={menuRef}
      >
        <div className="tc-nav-menu-bar">
          <span className="tc-wordmark tc-header-brand">TypeCast</span>
          <button
            aria-label="Close menu"
            className="tc-nav-menu-close"
            onClick={closeMenu}
            type="button"
          >
            <Icon name="x" size="lg" />
          </button>
        </div>
        <nav aria-label="Menu">
          <ul className="tc-nav-menu-list">
            {CATALOG_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  className="tc-nav-menu-link"
                  href={link.href}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                className="tc-nav-menu-link"
                href={GITHUB_URL}
                onClick={closeMenu}
              >
                <Icon name="github" />
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </dialog>
    </header>
  );
}

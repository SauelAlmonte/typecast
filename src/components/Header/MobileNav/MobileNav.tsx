"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATALOG_LINKS, GITHUB_URL } from "@/components/Header/links";
import Icon from "@/components/Icon/Icon";

/**
 * The phone menu: hamburger button plus the full-screen menu behind
 * it. The menu is a native dialog: focus trapping, Escape, and
 * background inertness come from the platform instead of hand-rolled
 * listeners.
 */
export default function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);

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
    <>
      <button
        aria-controls="tc-mobile-nav"
        aria-expanded={menuOpen}
        aria-label="Menu"
        className="tc-mobile-nav__button"
        onClick={openMenu}
        type="button"
      >
        <Icon name="menu" size="lg" />
      </button>
      {/* onClose fires for every close path (button, Escape, link), so
          aria-expanded can never drift from the dialog's real state. */}
      <dialog
        className="tc-mobile-nav"
        id="tc-mobile-nav"
        onClose={() => setMenuOpen(false)}
        ref={menuRef}
      >
        <div className="tc-mobile-nav__bar">
          <span className="tc-wordmark tc-header__brand">TypeCast</span>
          <button
            aria-label="Close menu"
            className="tc-mobile-nav__close"
            onClick={closeMenu}
            type="button"
          >
            <Icon name="x" size="lg" />
          </button>
        </div>
        <nav aria-label="Menu">
          <ul className="tc-mobile-nav__list">
            {CATALOG_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  className="tc-mobile-nav__link"
                  href={link.href}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                className="tc-mobile-nav__link"
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
    </>
  );
}

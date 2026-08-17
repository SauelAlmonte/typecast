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
  const closeRef = useRef<HTMLButtonElement>(null);

  // Growing the window past the breakpoint hides the hamburger, so the
  // menu must not be able to outlive its only opener.
  useEffect(() => {
    // Exact complement of the CSS mobile range (width <= 48rem): with
    // min-width both would match at exactly 48rem, so a menu opened
    // there would outlive its opener.
    const query = window.matchMedia("(width > 48rem)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) menuRef.current?.close();
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function openMenu() {
    menuRef.current?.showModal();
    // showModal hands focus to the first focusable descendant, which is
    // now the wordmark home link; opening a menu should land on the
    // control that dismisses it, not one that navigates away. React's
    // autoFocus can't express this: it fires at mount, not at showModal.
    closeRef.current?.focus();
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
        aria-label="Menu"
        className="tc-mobile-nav"
        id="tc-mobile-nav"
        onClose={() => setMenuOpen(false)}
        ref={menuRef}
      >
        <div className="tc-mobile-nav__bar">
          {/* A real home link like the desktop wordmark; closing on click
              keeps the dialog from surviving the navigation. */}
          <Link
            className="tc-wordmark tc-header__brand"
            href="/"
            onClick={closeMenu}
          >
            TypeCast
          </Link>
          <button
            aria-label="Close menu"
            className="tc-mobile-nav__close"
            onClick={closeMenu}
            ref={closeRef}
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

import Link from "next/link";
import { CATALOG_LINKS, GITHUB_URL } from "@/components/Header/links";
import MobileNav from "@/components/Header/MobileNav/MobileNav";
import Icon from "@/components/Icon/Icon";

/**
 * The header's nav row: brand, catalog links, GitHub. Below the tablet
 * band the links collapse into the phone menu, which MobileNav owns
 * together with its hamburger opener.
 */
export default function Navbar() {
  return (
    <nav aria-label="Primary" className="tc-navbar">
      <Link className="tc-wordmark" href="/">
        TypeCast
      </Link>
      <div className="tc-navbar__links">
        {CATALOG_LINKS.map((link) => (
          <Link
            className="tc-ui tc-navbar__link"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <a
        className="tc-ui tc-navbar__link tc-navbar__link--github"
        href={GITHUB_URL}
      >
        <Icon name="github" size="sm" />
        GitHub
      </a>
      <MobileNav />
    </nav>
  );
}

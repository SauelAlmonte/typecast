import Link from "next/link";
import Icon from "@/components/Icon";

export default function Header() {
  return (
    <header className="tc-header">
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

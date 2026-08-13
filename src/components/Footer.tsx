import Image from "next/image";

export default function Footer() {
  return (
    <footer className="tc-footer">
      <div className="tc-container-wide tc-footer-inner">
        <span className="tc-wordmark">TypeCast</span>
        <a
          className="tc-ui tc-footer-link"
          href="https://github.com/SauelAlmonte/typecast"
        >
          GitHub
        </a>
      </div>
      <div className="tc-container-wide tc-footer-legal">
        {/* TMDB's terms require their logo alongside the attribution. */}
        <a className="tc-footer-tmdb" href="https://www.themoviedb.org/">
          {/* unoptimized: the optimizer refuses SVG by default, and a
              1 KB vector gains nothing from it anyway. */}
          <Image
            alt="TMDB"
            height={13}
            src="/tmdb-logo.svg"
            unoptimized
            width={100}
          />
        </a>
        <p className="tc-meta tc-footer-note">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <p className="tc-meta tc-footer-note">
          © {new Date().getFullYear()} Sauel Almonte. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

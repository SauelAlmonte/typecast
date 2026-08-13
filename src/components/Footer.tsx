export default function Footer() {
  return (
    <footer className="tc-footer">
      <div className="tc-container-wide tc-footer-inner">
        <span className="tc-wordmark">TypeCast</span>
        <p className="tc-meta tc-footer-note">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <a
          className="tc-ui tc-footer-link"
          href="https://github.com/SauelAlmonte/typecast"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

// §7 — Lucide glyphs (MIT) inlined as one sprite: every icon on one request,
// no component package. Symbols carry the 24×24 grid; stroke styling lives
// on .tc-icon consumers (see icon.css for why).
// Inline style, not the display attribute: reset.css sets svg to block,
// and CSS beats presentation attributes, which left a ghost 150px box.
export default function IconSprite() {
  return (
    <svg aria-hidden="true" style={{ display: "none" }}>
      <defs>
        <symbol id="icon-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </symbol>
        <symbol id="icon-github" viewBox="0 0 24 24">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </symbol>
        <symbol id="icon-chevron-left" viewBox="0 0 24 24">
          <path d="m15 18-6-6 6-6" />
        </symbol>
        <symbol id="icon-chevron-right" viewBox="0 0 24 24">
          <path d="m9 18 6-6-6-6" />
        </symbol>
        <symbol id="icon-menu" viewBox="0 0 24 24">
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </symbol>
        <symbol id="icon-x" viewBox="0 0 24 24">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </symbol>
        <symbol id="icon-play" viewBox="0 0 24 24">
          <polygon points="6 3 20 12 6 21 6 3" />
        </symbol>
        <symbol id="icon-pause" viewBox="0 0 24 24">
          <rect height="16" rx="1" width="4" x="6" y="4" />
          <rect height="16" rx="1" width="4" x="14" y="4" />
        </symbol>
        <symbol id="icon-image" viewBox="0 0 24 24">
          <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </symbol>
        <symbol id="icon-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </symbol>
        <symbol id="icon-monitor" viewBox="0 0 24 24">
          <rect height="14" rx="2" width="20" x="2" y="3" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </symbol>
        <symbol id="icon-moon" viewBox="0 0 24 24">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </symbol>
      </defs>
    </svg>
  );
}

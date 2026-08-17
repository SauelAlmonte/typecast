"use client";

/**
 * The copyright year, read in the browser. The landing is statically
 * prerendered, so a server-side Date would freeze at build time and go
 * stale every January until the next deploy. suppressHydrationWarning
 * covers the one moment the build-time HTML and the client disagree:
 * the New Year rollover.
 */
export default function CopyrightYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}

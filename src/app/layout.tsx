import type { Metadata } from "next";
import { Bricolage_Grotesque, Gochi_Hand, Onest } from "next/font/google";
import "@/styles/global.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"], // wght is always included; opsz drives headline vs. small-text rendering
  display: "swap",
  variable: "--font-display",
});

const text = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-text",
});

const brand = Gochi_Hand({
  subsets: ["latin"],
  weight: "400", // static family — weight is required
  display: "swap",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  // Absolute base for social-card image URLs; scrapers reject relatives.
  metadataBase: new URL("https://typecast-sepia.vercel.app"),
  title: "TypeCast: Search. Resolve. Watch.",
  description:
    "Search-as-you-type for film. Unfinished typing resolves into the exact movie, powered by hand-built debouncing, request cancellation, caching, and keyboard navigation.",
};

/* Replays the stored theme choice before first paint. Must stay a
 * blocking inline script: anything deferred flashes the OS theme for
 * users who chose the other one. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("tc-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${brand.variable}`}
      // The theme script sets data-theme before hydration, so the
      // client <html> legitimately differs from the server render.
      // Scopes to this element's attributes only, nothing deeper.
      suppressHydrationWarning
    >
      <body>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static string, no user input; see THEME_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}

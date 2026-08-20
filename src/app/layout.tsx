import type { Metadata } from "next";
import { Bricolage_Grotesque, Gochi_Hand, Onest } from "next/font/google";
import "@/styles/global.css";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import IconSprite from "@/components/Icon/IconSprite/IconSprite";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${brand.variable}`}
    >
      <body>
        <a className="tc-skip-link" href="#main">
          Skip to content
        </a>
        <IconSprite />
        <Header />
        {/* tabIndex lets the skip link land focus here in every browser. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

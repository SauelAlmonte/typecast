import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { media, people } from "../src/db/schema";

// Local runs read Neon credentials from .env.local; in CI the file is
// absent (this no-ops) and the job env carries them.
config({ path: ".env.local" });

/* These specs assert what the BUILD produced, so they only mean
 * something against a production build: `next dev` enforces neither
 * generateStaticParams nor dynamicParams. The regression they guard:
 * an empty or partial param list shipped once (commit 8343130) and
 * left every detail page rendering on demand for crawlers. */
const prod = !!process.env.CI || !!process.env.E2E_PROD;

/** Every prerendered page under one app-route directory. */
function htmlCount(dir: string): number {
  return readdirSync(join(".next/server/app", dir), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".html")).length;
}

test.describe("bounded detail routes", () => {
  test.skip(!prod, "build artifacts exist only in production mode");

  test("prerendered title pages match the media table exactly", async () => {
    const [{ count }] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(media);
    expect(count).toBeGreaterThan(0);
    expect(htmlCount("title")).toBe(count);
  });

  test("prerendered person pages match the people table exactly", async () => {
    const [{ count }] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(people);
    expect(count).toBeGreaterThan(0);
    expect(htmlCount("person")).toBe(count);
  });

  test("an unknown title id is a 404, not a render", async ({ page }) => {
    const response = await page.goto("/title/movie/999999999");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found")).toBeVisible();
  });
});

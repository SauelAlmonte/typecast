import { upcomingTitles } from "@/db/queries";

export type { UpcomingItem } from "@/db/queries";

/** The rotation changes at sync cadence, once a day; let the CDN hold it. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

/**
 * Latest and upcoming titles as JSON. The landing hero now gets the same
 * rows server-side ({@link upcomingTitles}); this endpoint remains for
 * anything that wants the raw list.
 */
export async function GET(): Promise<Response> {
  return Response.json(await upcomingTitles(), {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

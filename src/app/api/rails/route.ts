import { categoryRails } from "@/db/queries";

export type { Rail, RailItem } from "@/db/queries";

/** Rails change at sync cadence, once a day; let the CDN hold them. */
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

/**
 * The category rails as JSON. The landing page now renders the same
 * rows server-side ({@link categoryRails}); this endpoint remains for
 * anything that wants the raw list.
 */
export async function GET(): Promise<Response> {
  return Response.json(await categoryRails(), {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

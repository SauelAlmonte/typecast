import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof create> | null = null;

function create() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }
  // The HTTP driver treats every query as a stateless fetch: no connection to
  // open, hold, or leak, which is the right shape for short-lived route handlers.
  return drizzle(neon(process.env.DATABASE_URL), { schema });
}

/**
 * The database client, created on first use.
 *
 * Lazy on purpose: `next build` imports every route file while collecting
 * page data, and an import-time env check would fail any build that has no
 * database url, CI included. Requests are the first moment the url matters.
 *
 * @returns The shared Drizzle client bound to Neon over HTTP.
 * @throws When `DATABASE_URL` is missing at first use.
 */
export function getDb() {
  cached ??= create();
  return cached;
}

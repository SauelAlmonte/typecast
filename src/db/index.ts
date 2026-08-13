import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

// The HTTP driver treats every query as a stateless fetch: no connection to
// open, hold, or leak, which is the right shape for short-lived route handlers.
export const db = drizzle(neon(process.env.DATABASE_URL), { schema });

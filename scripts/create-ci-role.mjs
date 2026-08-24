/**
 * One-time (rerunnable) setup for the least-privilege database split:
 * a `ci_read` Neon role that can SELECT and nothing else, for CI's
 * builds and specs, while the sync workflow keeps the owner role.
 *
 * Run by Sauel, never by automation, because it handles credentials:
 *
 *   CI_ROLE_PW=$(openssl rand -hex 24) \
 *     node --env-file=.env.local scripts/create-ci-role.mjs
 *
 * Creates or rotates the role, grants read-only access (current and
 * future tables), proves a write is denied, then writes two GitHub
 * Actions secrets via the gh CLI: DATABASE_URL (the read-only URL,
 * used by ci.yml) and DATABASE_URL_ADMIN (the owner URL from
 * .env.local, used by sync.yml). Prints statuses only, never values.
 */
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";

const admin = process.env.DATABASE_URL;
const pw = process.env.CI_ROLE_PW;
if (!admin || !pw) {
  throw new Error("DATABASE_URL and CI_ROLE_PW must be set");
}
const sql = neon(admin);

const exists = await sql`select 1 from pg_roles where rolname = 'ci_read'`;
if (exists.length === 0) {
  // pw is hex from openssl: no quoting hazard in the literal.
  await sql.query(`CREATE ROLE ci_read WITH LOGIN PASSWORD '${pw}'`);
  console.log("role: created");
} else {
  await sql.query(`ALTER ROLE ci_read WITH LOGIN PASSWORD '${pw}'`);
  console.log("role: password rotated");
}
await sql.query("GRANT USAGE ON SCHEMA public TO ci_read");
await sql.query("GRANT SELECT ON ALL TABLES IN SCHEMA public TO ci_read");
await sql.query(
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ci_read",
);

const ciUrl = new URL(admin);
ciUrl.username = "ci_read";
ciUrl.password = pw;

const readOnly = neon(ciUrl.toString());
const [{ c }] = await readOnly`select count(*)::int as c from media`;
console.log(`read check: media count ${c} via ci_read`);
try {
  await readOnly.query("create table ci_write_probe(id int)");
  console.log("WRITE CHECK FAILED: ci_read could create a table");
  process.exit(1);
} catch {
  console.log("write check: denied, as intended");
}

for (const [name, body] of [
  ["DATABASE_URL", ciUrl.toString()],
  ["DATABASE_URL_ADMIN", admin],
]) {
  const result = spawnSync("gh", ["secret", "set", name, "--body", body], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (result.status !== 0) {
    process.exit(1);
  }
  console.log(`secret ${name}: set`);
}

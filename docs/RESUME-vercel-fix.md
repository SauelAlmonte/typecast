# Resume: Vercel free-tier fix (PR #64)

Self-contained state of the Vercel un-pause work as of 2026-08-24,
~10:30 EDT. A fresh session needs nothing else.

## Why this work exists

Vercel paused the Hobby team "Sauel Almonte's projects" on
2026-08-23 (~11pm EST notice). The usage window (~17 days) showed
11h 54m Fluid Active CPU against a 4h allowance (project typecast =
98.6% of it), 2.2M function invocations / 1M, 2.5M edge requests /
1M, 26 GB Fast Origin Transfer / 10 GB, and only 813 ISR reads.
Root cause: every route except the landing page was server-rendered
per request, and the detail pages link TMDB's entire id space through
recommendation and cast rails, so crawlers never ran out of fresh
URLs (~20ms CPU × 2.2M, volume not weight). A separate Image
Optimization overage (6.1K/5K) was already fixed by the custom TMDB
image loader in `ecb85cb`.

## Round one and what it got wrong

PR #63 (merged, `8343130`) added on-demand ISR (`revalidate` + empty
`generateStaticParams`), robots.txt, suggest q-cap + longer CDN
headers, and Upstash rate limiting (verified live: 30/10s per IP,
then 429, releases after 10s; env-gated, vars exist in Upstash but
NOT yet in Vercel). What it got wrong: `dynamicParams` defaulted to
true and the params list was empty, so zero paths prerendered and a
crawler walking fresh ids still rendered every first hit, now with
an ISR write attached. Sauel's round-two handoff called it out;
verified accurate.

## Round two: PR #64 (branch fix/bounded-detail-routes)

Open, all work committed and pushed. Commits:

- `a44e8a1` bound the detail routes to the catalog (dynamicParams =
  false, DB-sourced generateStaticParams, credits pass in sync,
  rails link-integrity, GH Actions daily sync + deploy hook,
  E2E_PROD mode + regression specs, CI secrets, README truth pass)
- `0289b8e` React cache() dedupe of the metadata+page TMDB fetch
  (measured: it genuinely fetched twice per page)
- `d81088d` rate gate, full-catalog credits backfill, split db
  privileges (ci_read role), CI .next/cache caching
- `d36cb92` all eight CodeRabbit review findings (see below)

All 8 review threads replied to (naming d36cb92) and resolved.

## The seven verification answers (Sauel's pre-merge checks)

1. **Canonical numbers** (final build, d81088d/d36cb92): 3,011
   detail pages = 3,011 TMDB build calls (385 titles + 2,626
   people); 3,021 total prerendered (+10 fixed routes). PR body
   corrected; old 2,322/2,332/2,323 confusion resolved.
2. **The 115-title gap**: media rows never in a prune; earlier-sync
   titles had left TMDB's lists so the credits pass missed them.
   Fixed: the pass reads the whole catalog. Steady state people =
   top billing of every catalog title + popular 60 = 2,626 today.
3. **Hook ordering**: workflow steps are sequential — sync-people,
   then sync-media, whose last await fires the hook. It cannot fire
   before both syncs finish. sync-people has no hook on purpose.
4. **Rate cap**: concurrency is not a rate cap (measured 144 req/s
   warm at 65ms latencies). Added a per-process ~3 req/s gate under
   the semaphore (TMDB_MIN_INTERVAL_MS = 334 in src/lib/tmdb.ts).
   Measured after: flat 21 req/s in every 1s bucket, peak
   concurrency 6, global worst case ~39 req/s at 13 workers.
5. **Growth ceiling**: path ceiling at the effective 1d revalidate ≈
   (200,000 − 720)/30 ≈ 6,642; current 3,011, ~3,600 headroom, ~5
   months at ~100 new titles/month (each brings ~5-7 new people).
   Worst case assumes daily post-expiry visits, which daily rebuilds
   preempt; realistic writes ≈ 0. Trigger: Usage-page ISR writes
   trending past ~100K/month → raise BOTH revalidates (route and
   fetch, src/app/title and person pages + src/lib/tmdb.ts) to 7d.
   Note: route revalidate is written 604800 but the fetch-level
   86400 floors the effective value to 1d (visible in the build
   table and s-maxage=86400 headers). Deliberate, documented.
6. **Split db privileges**: DONE including Sauel's part — he ran
   scripts/create-ci-role.mjs (2026-08-24 ~10:30): ci_read role
   created, read check passed (media 385), write denied, and both
   Actions secrets set (DATABASE_URL = read-only ci_read URL,
   DATABASE_URL_ADMIN = owner URL). ci.yml reads; sync.yml writes.
7. **CI cost**: contained by actions/cache on .next/cache — the
   framework data cache carries TMDB responses across CI runs; first
   build of a day refetches expired entries, later ones near zero.
   Exact-equality spec untouched.

WebKit: never dropped — CI runs chromium+firefox+webkit; local runs
are chromium+firefox (26/26), the config gates webkit to CI.

## The eight review fixes (all in d36cb92)

1. ci.yml: `permissions: contents: read` (workflow level).
2. sync.yml: "Require deploy hook" step fails the run when the
   secret is empty (silent green = silent freeze).
3. sync.yml: same permissions block, `persist-credentials: false`,
   secrets moved from job env to the steps that use them (both
   workflow files got the persist-credentials + step-env treatment).
4. README diagram names both sync commands.
5. Rails: filter to in-catalog BEFORE the 12-cap (title
   recommendations + person Known For), so catalog members ranked
   below 12 by TMDB still make the rail.
6. carousel.css: hover/focus underline scoped `:is(a)` so the
   unlinked cast span shows no link affordance.
7. Landing page: rails query wrapped in try/catch (log + empty
   stack) so a Neon failure can't take down the hero.
8. tmdb.ts: per-attempt AbortController (the 10s timeout aborts the
   request instead of orphaning it past its semaphore slot);
   429/5xx bodies drained before retry; withTimeout deleted.
   Verified against local mocks: two 429s then 200 in 3 attempts
   (Retry-After honored to the ms); hung server → four 10s aborts
   then throw (~48s with backoffs).

## Verified state (final build, worktree, d36cb92)

- Build exit 0, 2m 37s total, 3,021 pages in 2.4min, 13 workers.
- HTML on disk: 385 title + 2,626 person = `select count(*)` exactly.
- Known id: 200, x-nextjs-cache HIT, s-maxage=86400. Unknown id:
  404 in 4-11ms, same band as robots.txt (static, no render, no DB).
- E2E_PROD suite 26/26 (chromium+firefox).
- Zero TMDB 429s across ~10K real calls on 2026-08-24.

## Blocking on Sauel

1. **CI green on d36cb92, then merge PR #64.** CI was still running
   at session end; the earlier run on `0289b8e` re-ran green after
   the first two secrets landed. If the e2e job fails on DB auth,
   suspect the ci_read URL (he rotated DATABASE_URL to it mid-day).
2. **After merge: disable the "Daily sync" workflow** (Actions tab →
   Daily sync → ⋯ → Disable). Its Require-deploy-hook step fails by
   design until the un-pause; disabling avoids daily red mail.
3. **Un-pause request to Vercel**: already drafted and possibly
   already posted via vercel.com/help chat (Sauel was in the widget
   2026-08-24 ~09:00; body text lives in the session log and can be
   reconstructed from this doc + PR bodies). Pause date for forms:
   August 23, 2026, ~11:05pm EST.
4. **After un-pause, in order**: (a) add Upstash env vars
   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (values in
   .env.local / Upstash console, database typecast-ratelimit,
   us-east-1) to Vercel Production env BEFORE the first redeploy;
   (b) create the Deploy Hook (project Settings → Git → Deploy
   Hooks, name daily-sync, branch main — creation was blocked while
   paused); (c) add its URL as Actions secret VERCEL_DEPLOY_HOOK_URL;
   (d) re-enable the Daily sync workflow; (e) redeploy.
5. ISR-writes watch item: glance at the Usage page the first week.

## Re-verify from cold

```bash
git checkout fix/bounded-detail-routes   # or main after merge
pnpm install
pnpm lint && pnpm exec tsc --noEmit
pnpm build                                # needs .env.local; ~2.5 min,
                                          # ~3K TMDB calls, flat ~21 req/s
find .next/server/app/title -name '*.html' | wc -l    # = media count
find .next/server/app/person -name '*.html' | wc -l   # = people count
E2E_PROD=1 pnpm test:e2e                  # prod build on port 3100
# TMDB traffic instrumentation: TMDB_LOG_TIMING=1 pnpm build,
# then sweep the [tmdb] start/done lines for rate and concurrency.
```

Rules that bit this session (already in memory files): never touch
port 3000 or run `pnpm build` in the live tree while Sauel's dev
server runs — build/e2e verification happens in a detached git
worktree in the scratchpad, with .env.local copied in. Never kill a
PID without lsof proof of what it serves.

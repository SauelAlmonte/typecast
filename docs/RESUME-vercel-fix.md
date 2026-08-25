# Resume: Vercel free-tier fix (PR #64)

Self-contained state of the Vercel un-pause work, written 2026-08-24
~10:30 EDT and corrected 2026-08-25 after the merge. A fresh session
needs nothing else.

## Since the merge (2026-08-25)

- PR #64 merged 2026-08-24 10:46 EDT (`ec77c0b`); the branch is
  deleted local and remote, `main` is clean.
- `main`'s post-merge CI is red on the Lighthouse job only: it audits
  the production URL, which answers 402 while the team is paused.
  Lint, build, and e2e passed. It clears on the first `main` push
  after the un-pause.
- Daily sync fired 2026-08-25 06:00 EDT and failed at the deploy-hook
  gate as designed. Sauel's call: the gate now skips with a warning
  annotation instead of failing (PR #65), so the
  syncs keep the catalog current through the pause, the run stays
  green, and setting `VERCEL_DEPLOY_HOOK_URL` is the whole switch.
  The workflow stays enabled. Merged as PR #65 (`d96b129`); `main`'s
  CI on it: lint, build, and e2e (39/39) green, Lighthouse red on the
  402 only.
- The 3,011 detail pages split 385 titles + 2,626 people (route table
  of the merged build, CI run 32739240712; unchanged in PR #65's run
  32866904237, since no sync has written to the database yet).
- Vercel Firewall set 2026-08-25 while paused: Bot Protection to
  Challenge, AI Bots to Deny. Part of the fix, not a footnote:
  bounded routes cut CPU, invocations, and origin transfer, but a
  crawler still costs an edge request per URL, and the firewall is
  the only lever on that meter for crawlers that ignore robots.txt.
- Upstash env vars are already in Vercel Production (added during
  the pause). The limiter is env-gated at module load, so it comes
  on with the first deploy after the un-pause; nothing to add then.

## Why this work exists

Vercel paused the Hobby team "Sauel Almonte's projects" on
2026-08-23 (~11pm EST notice). The usage window (~17 days) had four
meters over: Fluid Active CPU 11h 54m against a 4h allowance
(project typecast = 98.6% of it), Invocations 2,207,478 / 1M, Edge
Requests 2,700,927 / 1M, Fast Origin Transfer 26.09 GB / 10 GB. ISR
Reads were 813, well under. Which part of the fix addresses which
meter is in PROGRESS.md's "Free tier means bounded rendering" row;
in short, bounded routes handle CPU, invocations, and origin
transfer, and the Vercel Firewall handles edge requests.
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

## Round two: PR #64 (was branch fix/bounded-detail-routes)

Merged 2026-08-24 (`ec77c0b`). Commits:

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
   Exact-equality spec untouched. Wall time does not show whether the
   cache hit: the rate gate paces every tmdb call before the framework
   cache answers, so even a fully cached CI build takes
   3,011 × 334 ms ÷ 3 workers ≈ 5.6 min (measured 5.6 min on the
   merged commit). Count calls with `TMDB_LOG_TIMING=1` to verify the
   cache, not the clock.

WebKit: never dropped — CI runs chromium+firefox+webkit; local runs
are chromium+firefox (26/26), the config gates webkit to CI.

## The eight review fixes (all in d36cb92)

1. ci.yml: `permissions: contents: read` (workflow level).
2. sync.yml: "Require deploy hook" step fails the run when the
   secret is empty (silent green = silent freeze). Since replaced by
   a skip-with-warning step on Sauel's call; see "Since the merge".
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

1. ~~CI green on d36cb92, then merge PR #64.~~ Done 2026-08-24; CI
   on `c6e2fc0` was green (Lighthouse skipped on PRs by design).
2. ~~After merge: disable the "Daily sync" workflow.~~ Superseded:
   the gate skips with a warning now. Leave the workflow enabled.
3. **Un-pause request to Vercel**: drafted, not yet sent as of this
   edit; every claim in it was audited against `main` at `d96b129`
   on 2026-08-25. Pause date for forms: August 23, 2026, ~11:05pm
   EST.
4. **After un-pause, in order**: (a) create the Deploy Hook (project
   Settings → Git → Deploy Hooks, name daily-sync, branch main —
   creation is blocked while paused, which PR #65's skip covers);
   (b) add its URL as Actions secret VERCEL_DEPLOY_HOOK_URL — the
   next scheduled run deploys on its own; (c) redeploy. The Upstash
   env vars are already in Vercel Production; the limiter is
   env-gated at module load, so it comes on with that deploy.
5. Usage-page watch, first week: ISR writes (raise both revalidates
   to 7d if trending past ~100K/month) and edge requests (the
   firewall's meter).
6. **Lighthouse will fail after the un-pause, and not for a real
   reason**: Bot Protection (Challenge) challenges non-browser
   sources, and CI's Lighthouse job audits the production URL on
   pushes to `main`. Add a firewall allow exception for the job; do
   not debug it as a score regression.
7. Warm-cache build wall time is tracked in issue #66: the TMDB gate
   paces every call before Next's fetch cache answers.

## Re-verify from cold

```bash
git checkout main                        # PR #64 is merged
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

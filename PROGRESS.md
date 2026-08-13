# Typecast — Progress

Running log of where the project stands, what's been decided, and what's still open.

**Phase:** The deliverable works end to end. Backend: TMDB catalog synced
into Neon, trigram-indexed, served by a ranked suggest endpoint whose
ranking SQL Sauel wrote. Frontend: the hand-built combobox with debounce,
cancellation, cache, keyboard, ARIA, recents, and an e2e suite. Next:
productization (deploy, rate limiting, server cache, scheduled sync) and
the landing redesign with the hero rotation.

---

## Decided

| Date | Decision | Detail |
| --- | --- | --- |
| 2026-08-08 | Config scope | This pass covers *how we work* only — collaboration norms, verification, permissions, hooks. Directory and file-layout conventions are deferred until after the system design, so they're decisions rather than guesses. |
| 2026-08-08 | Interaction mode | Explain-first on the core (autocomplete, caching, a11y, ranking, system design); build-then-offer-depth on plumbing (config, CI, migrations, deps). Replies concise, plain English, on-topic. |
| 2026-08-08 | Hooks posture | Full gauntlet — format on edit, typecheck + lint + affected tests on stop, `PreToolUse` guard on sensitive paths. That's the target posture; implemented 2026-08-12 (PR #3) except affected tests, which wait on Vitest. The sensitive-path guard became permission-deny rules. |
| 2026-08-08 | Rules location | Project instructions live in `AGENTS.md` around the Next.js managed block. Verified safe: `next dev` only rewrites text between its `BEGIN`/`END` markers, preserving everything above and below. |
| 2026-08-08 | Reply rules go first | The reply-style and core/plumbing rules sit at the very top of `AGENTS.md`, above the Next.js block, as the highest-priority instruction. |
| 2026-08-08 | Session ritual | `PROGRESS.md` is updated at the end of every session, unprompted. Rule lives in `AGENTS.md`. |
| 2026-08-08 | Git workflow | Always branch off `main` (`feat/<kebab-description>`), Conventional Commits with plain-English reasoning in the body, PR against `main`, then post-merge cleanup once Sauel confirms the merge and green CI. Branch, commit, push, and PR are standing-authorised; merging is his. |
| 2026-08-08 | Review threads | Inline PR comments get verified against the code first, fixed or skipped with a stated reason, replied to with the fixing commit, and then always resolved. Rule lives in `.claude/rules/git-workflow.md`. |
| 2026-08-08 | Rules layout | Modular files: rules live in `.claude/rules/*.md`, which Claude Code discovers recursively and loads at launch with the same priority as `.claude/CLAUDE.md`. **No `@`-import needed.** Corrected on PR #1 after CodeRabbit flagged the redundant import — the original entry was recorded on bad information from Claude. Rules also accept `paths:` frontmatter to scope loading to matching files. |
| 2026-08-08 | Progress batching | `PROGRESS.md` updates accumulate and ship as one `docs/` PR at session end, rather than a PR per edit. |
| 2026-08-12 | Harness split | Static yes/no decisions live in `permissions` (deny all MCP tools, deny `.env.local` read/write, allow the four verification commands); hook scripts exist only where a decision needs code. Hooks live in `.claude/hooks/`, pointed at by `settings.json`. |
| 2026-08-12 | Hooks implemented | Five scripts, all live: `branch-guard` and `bash-branch-guard` (PreToolUse) deny edits and mutating shell commands on `main`; `post-edit` (PostToolUse) formats then lints every supported written file (TS/JS/JSON/CSS), feeding lint errors back to Claude; `stop-check` (Stop) runs typecheck + lint before a turn can end, failing closed on discovery errors; `reply-style` (UserPromptSubmit) re-injects the reply rule every prompt. |
| 2026-08-12 | Commit signing | SSH signing with `~/.ssh/id_ed25519`, key registered on GitHub as a Signing Key. Verified end to end — GitHub reports `verified: true` on PR #3's commits. |
| 2026-08-12 | Contributor listing | The `Co-Authored-By` trailer makes Claude show under Contributors on GitHub. Kept deliberately: it marks which commits were Claude-authored, part of demonstrating the harness. |
| 2026-08-13 | Playwright pin | `@playwright/test` pinned exactly to 1.61.0 — the last release whose Chromium/Firefox builds support macOS 12, which this machine runs. A caret range would let a routine `pnpm update` silently break local e2e. WebKit has no usable macOS 12 build at any version (1.49–1.55 all serve one frozen late-2024 binary), so the webkit project is gated to CI, where WebKit is current. Unpin when the Mac is upgraded. |
| 2026-08-13 | E2E layout | Tests live in `e2e/` at the repo root, `@playwright/test` only — no MCP, no SDKs, no screenshot config. Locally the webServer starts or reuses the dev server; in CI it serves the production build, per the Next.js 16 testing guide. |
| 2026-08-13 | CI shape | One workflow, two parallel jobs on push/PR to `main`: lint + typecheck (`next typegen` before `tsc`, the PR #3 lesson) and build + Playwright e2e. Node 24 to match local, pnpm from the `packageManager` field, frozen lockfile, concurrency cancels superseded runs. |
| 2026-08-13 | Plain CSS over Tailwind | The design doc's one pending decision, settled by Sauel: the §9 tree ships as plain CSS. Tokens live in `src/styles/tokens.css`; component files consume tokens and never declare raw values. The reset is hand-written. |
| 2026-08-13 | Theming deferred | `color-scheme: dark light` with `light-dark()` is live (dark default), but the `[data-theme]` override selectors are deliberately absent: the doc forbids shipping them without a toggle control and a blocking anti-flash script, and neither exists yet. |
| 2026-08-13 | Component layout | Flat `src/components/` with PascalCase files; each component's CSS lives in `src/styles/components/*.css`, imported by `main.css` in §9 order. First structure decision made after the system design, per the config-phase rule. |
| 2026-08-13 | Landing shape | Every section is a labelled landmark region filling the viewport below a fixed header: `min-block-size: calc(100svh - var(--size-header))` with mandatory scroll snap (Sauel's call over the proximity recommendation) and `scroll-padding` keeping snap targets clear of the bar. The hero search field is the §5 static shell only, with no combobox ARIA until the real component exists. |
| 2026-08-13 | No em dashes | Anywhere Sauel reads: UI copy, metadata, commits, PR bodies, replies. Use periods, commas, or colons. |
| 2026-08-13 | pnpm pin policy | `packageManager` must exactly match the globally installed pnpm on every machine. pnpm 11.20.0 added a fail-closed identity check when delegating to a different pinned version, and Intel macOS has no published 11.x binary package after 11.0.4, so any mismatch kills every pnpm command in the repo with a misleading "missing from pnpm-lock.yaml" error. An exact match skips delegation entirely. Keep the pin and both globals in lockstep until upstream resolves pnpm/pnpm#13622. CI is immune: `pnpm/action-setup` installs the exact pinned version. |
| 2026-08-13 | Catalog architecture | Option B, the local catalog: a sync script pulls TMDB lists into Neon and search runs against our own table and indexes. Owning ranking, latency, and indexing is the point of the project; TMDB is only touched by the background sync. |
| 2026-08-13 | Search matching | Matching runs against `title_search`, filled by one `normalizeSearchText` function (lowercase, NFKD, strip marks, collapse whitespace) used identically at ingest, at query time, and as the client cache key. Fragments of 1 to 2 chars prefix-scan; 3+ use `pg_trgm` with `word_similarity`, because whole-title `similarity()` under-scores short fragments (measured: 0.294 for "stran" vs Stranger Things). Ranking is Sauel's three-key sort: exact prefix first, word similarity, popularity tiebreak, threshold 0.4. |
| 2026-08-13 | TSDoc | Exported APIs get TSDoc comments documenting semantics. Never restate types the signature already carries. |
| 2026-08-13 | Reply density | Sauel rejected fact-packed summary sentences mid-session. One idea per sentence, plain words, define terms on first use. Recorded alongside the existing concise-reply rule. |
| 2026-08-13 | Combobox teaching build | The component was built naive-first on purpose: fetch per keystroke shipped, measured (8 requests for "stranger"), then fixed one layer at a time so every optimization answered a problem watched in the Network tab. Sauel typed debounce, cancellation, and cache himself. |
| 2026-08-13 | Listbox markup | The suggestion listbox is divs with ARIA roles, not ul/li: Biome's a11y rules reject interactive roles on list tags and non-focusable options, and since a role replaces the tag's native semantics entirely, the neutral form is equivalent for assistive tech and lint-clean without carving exceptions into the a11y ruleset. |

---

## Open

- **Landing redesign with hero rotation**: Sauel wants a stronger design, and the hero background should cycle every minute through latest and upcoming titles from the catalog (`backdrop_path` is already stored for this).
- **Productization of search**: Upstash Redis server cache and rate limiting on the suggest endpoint, a scheduled sync (Vercel cron) replacing the manual `pnpm db:sync`, and a deploy to Vercel so the CDN cache headers actually meet a CDN.
- **Selection destination**: Enter currently just fills the input with the chosen title. Where selection should lead (detail page, TMDB link) is undecided.
- **Vitest unit tests**: `normalizeSearchText` and the ranking query are the first candidates. Also unlocks affected tests in `stop-check`.
- **px-to-rem pass**: type and containers are already rem; whether spacing and control-size tokens should convert too is an open design decision from Sauel's responsiveness rule.
- **Commit the design doc**: Design System v2.0 governs all UI work but lives only in chat history. It belongs in the repo, likely `docs/design-system.md`.
- **Theme toggle and anti-flash script**: the pair that unlocks the `[data-theme]` selectors. Deliberately deferred; see the theming decision.
- **Lighthouse**: planned for CI (never hooks). The landing page now gives it something real to audit, so it can be wired in.
- **Sandbox hardening**: CodeRabbit flagged on PR #3 that `Read`/`Edit` deny rules don't stop Bash subprocesses from reading `.env.local`. The real fix needs OS-level sandboxing (`sandbox.filesystem.denyRead`), which changes how every shell command runs and would also block `next build`'s legitimate env loading. Deferred as Sauel's call; the Bash branch guard narrows the gap meanwhile.
- **Migration guard**: a PreToolUse deny on edits to applied migration files, now that Drizzle exists and `src/db/migrations/` holds applied SQL.
- **Slash commands and subagents**: which recurring workflows are worth encoding.
- **Affected tests in `stop-check`**: once Vitest lands. Playwright already runs in CI and stays out of hooks.
- **TMDB logo attribution**: now due. TMDB data and poster art render in the suggestion panel, so their terms want the logo displayed, not just the footer text line from PR #8. Fold into the landing redesign.
- **Older MacBook pnpm**: still broken until it runs `npm i -g pnpm@11.21.0`, then `git pull` and `pnpm install`. Every pnpm command there fails until the global matches the pin.

---

## Done

- [x] Verified `AGENTS.md` is safe to edit — `next dev` preserves everything outside its managed markers (`node_modules/next/dist/server/lib/generate-agent-files.js`).
- [x] Fixed `.claude/settings.json` — was an empty file, which is invalid JSON rather than empty config. (`settings.local.json` had the same problem and was repaired too, but it's gitignored, so that fix is local-only and not reproducible from the repo.)
- [x] Gitignored `.claude/settings.local.json` and `CLAUDE.local.md` as personal, non-shared files.
- [x] Wrote the project context, interaction rules, and constraints into `AGENTS.md`.
- [x] Restructured `AGENTS.md` so the reply rules sit at the top, above the Next.js managed block. Confirmed intact afterwards with Next's own `hasCurrentAgentRules()`.
- [x] Created `PROGRESS.md` and added the end-of-session update rule to `AGENTS.md`.
- [x] Shipped PR #1 (`ed7243c`) — first end-to-end run of the workflow: branch, Conventional Commits, PR, review, merge, cleanup.
- [x] Corrected the `.claude/rules/` loading model. CodeRabbit contradicted Claude's earlier claim that the directory was inert; the Claude Code docs and the CLI binary both confirmed rules load natively, so the redundant `@`-import came out. Also surfaced `paths:` frontmatter for scoping rules to matching files.
- [x] Worked CodeRabbit's other findings: language identifiers on two Markdown fences, and a corrected settings-fix entry that no longer claims credit for repairing a gitignored file.
- [x] Replied to and resolved both review threads, then wrote the review-thread rule into `.claude/rules/git-workflow.md` — verify first, fix or skip with a reason, reply with the commit, always resolve.
- [x] Post-merge cleanup: `main` fast-forwarded, branch deleted local and remote, prune clean, working tree verified.
- [x] Set up SSH commit signing; registered the key on GitHub as a Signing Key. PR #3's commits show Verified.
- [x] Shipped PR #3 (`af13c48`) — the harness: permissions (MCP and `.env.local` denied, verification commands allowed) plus five hooks, each pipe-tested on allow/deny/malformed-input paths and proven live in-session (MCP tools vanished on reload; the formatter rewrote a mis-spaced file through the real pipeline).
- [x] Worked CodeRabbit's four findings on PR #3: fail-closed discovery in `stop-check`, surfaced `next typegen` failures, new Bash branch guard closing the shell escape on `main`; skipped sandbox denies with the reason in the thread. All threads replied to and resolved.
- [x] Learned the hard way that `next typegen` must run before `tsc --noEmit` on a never-built tree — Next 16 generates `LayoutProps` and friends into `.next/types`.
- [x] Shipped PR #4 (`621f070`) — the harness session's progress log; worked both CodeRabbit findings (scoped the hooks claims to what actually runs).
- [x] Shipped PR #5 (`b8fddbe`) — Playwright e2e setup (pinned 1.61.0, `e2e/` directory, smoke test green locally on Chromium + Firefox) and the full CI workflow, which ran its first gate on its own PR. "Wait for green CI" now means a real test/lint/typecheck gate, not CodeRabbit alone.
- [x] Shipped PR #6 (`1ac66ae`): the Playwright and CI session's progress log.
- [x] Received Design System v2.0 and shipped PR #7 (`ddd8c25`): the styles foundation. Tokens, hand-written reset, typography, layout, and base styles transcribed into `src/styles/`; the three §9 fonts wired through `next/font/google`; the scaffold's `globals.css` deleted.
- [x] Shipped PR #8 (`030313b`): the landing page. Six landmark sections as components plus the §7 Lucide icon sprite, full-height snap rhythm, static §5 search shell, Tier-1 result preview, TMDB attribution text in the footer, branded metadata, and the e2e smoke test tightened to match. In-PR iterations from Sauel's review: wordmark sized as the logo, em dashes stripped from copy, and the header switched from absolute to a fixed bar with matching scroll-padding after the snap carried it off-screen.
- [x] Diagnosed the pnpm failure Sauel hit on the older MacBook and reproduced it locally: not the lockfile, but pnpm 11.20.0's new delegation identity check, unpassable on Intel macOS. Confirmed the root cause against pnpm's own triage of pnpm/pnpm#13622 and the npm registry (no darwin-x64 binary published for any 11.x after 11.0.4), then proved the exact-match escape hatch in a scratch project before touching the repo.
- [x] Shipped PR #10 (`49a43a2`): `packageManager` bumped to pnpm 11.21.0 to match the installed global, plus the AGENTS.md stack line. Every pnpm command in the repo works again, hooks included.
- [x] Shipped PR #11 (`ebcb2dc`): nanoid 3.3.17 to 3.3.18 for CVE-2026-67213, a high-severity Dependabot alert GitHub surfaced during the PR #10 cleanup push. Transitive via next and postcss, exposure theoretical, lockfile-only patch bump. Alert closed on merge.
- [x] Provisioned the stack's external halves: TMDB read access token (v4 Bearer, header auth) and a Neon Postgres database created through the Vercel marketplace integration, both in `.env.local` (renamed from `.env`; the `Read(./.env.*)` deny rule already covered it). Neon Auth toggled off, Better Auth owns authentication later.
- [x] Shipped PR #13 (`d249ab3`): the data layer. Drizzle + Neon HTTP driver, one `media` table for movies and TV with the `(media_type, tmdb_id)` natural key, `pg_trgm` GIN index, migration applied and verified live. Biome skips generated migration meta; pnpm-workspace allows esbuild's postinstall.
- [x] Shipped PR #14 (`74b8ede`): scoped esbuild override clearing Dependabot alert #2 (moderate, dev-server CORS, unreachable code path via drizzle-kit's deprecated @esbuild-kit internals).
- [x] Shipped PR #15 (`a2d6369`): the sync job. Five TMDB lists into the catalog, normalized row shape, in-memory dedupe, excluded.* upsert. 195 titles landed on first run; trigram search verified against real data.
- [x] Shipped PR #16 (`d8b910e`): suggest endpoint scaffold. `title_search` column and shared normalize function, prefix branch under 3 chars, trigram branch above, lean payload, CDN cache headers. Includes the lazy `getDb()` fix after CI's databaseless build exposed the import-time env check. Merged as scaffold with ranking deliberately left as a marked slot.
- [x] Shipped PR #17 (`2ba4b23`): Sauel's ranking, his first hand-written SQL in the project, committed without the Claude trailer. Prefix matches first, `word_similarity` second, popularity tiebreak, 0.4 threshold. Acceptance test: "stran" returns Stranger Things first where the placeholder buried it entirely.
- [x] Set up WebStorm's database tooling along the way: Neon as a data source (the URL-overrides-fields trap: it must end in `/neondb`), PostgreSQL dialect for `sql` template strings, real schema-aware SQL assistance in the editor.
- [x] Shipped PR #18 (`ad28534`): the combobox. Built naive-first with Sauel typing debounce, cancellation, and cache; then keyboard and ARIA (activedescendant pattern), localStorage recents, empty state, TMDB poster rows via next/image, and 8 Playwright tests (16 runs across Chromium and Firefox) driven purely by ARIA semantics with the API mocked so CI needs no database. CodeRabbit's one finding (stale responses during the debounce window) verified, fixed with `cancelPending()` plus a request-identity guard, regression-tested, thread resolved.
- [x] The founding doc's efficiency stack is now fully implemented and measured: 8 requests for "stranger" became 1 to 2 (debounce), stale responses provably never paint (abort + identity guard, e2e-tested), and repeats render synchronously from a 50-entry normalized-key cache.

---

## Notes

`.claude/` holds empty `CLAUDE.md` placeholders in `agents/`, `commands/`,
`rules/`, and `skills/` — intentional scaffolding, inert until filled. Of
those, `agents/`, `commands/`, `skills/`, and `rules/` are read natively.
`hooks/` is pure convention — and as of PR #3 it holds the five live scripts
that `settings.json` points at by path.

Rules in `.claude/rules/*.md` are discovered recursively and load at launch with
the same priority as `.claude/CLAUDE.md`. Adding `paths:` frontmatter scopes a
rule to matching files, so it only enters context when Claude reads them — the
mechanism for keeping situational instructions out of every turn.
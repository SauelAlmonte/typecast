# Typecast — Progress

Running log of where the project stands, what's been decided, and what's still open.

**Phase:** Claude Code configuration — harness implemented and live. No
application code written yet. Next phase: system design.

---

## Decided

| Date | Decision | Detail |
| --- | --- | --- |
| 2026-08-08 | Config scope | This pass covers *how we work* only — collaboration norms, verification, permissions, hooks. Directory and file-layout conventions are deferred until after the system design, so they're decisions rather than guesses. |
| 2026-08-08 | Interaction mode | Explain-first on the core (autocomplete, caching, a11y, ranking, system design); build-then-offer-depth on plumbing (config, CI, migrations, deps). Replies concise, plain English, on-topic. |
| 2026-08-08 | Hooks posture | Full gauntlet — format on edit, typecheck + lint + affected tests on stop, `PreToolUse` guard on sensitive paths. Implemented 2026-08-12 (PR #3); the sensitive-path guard became permission deny rules. |
| 2026-08-08 | Rules location | Project instructions live in `AGENTS.md` around the Next.js managed block. Verified safe: `next dev` only rewrites text between its `BEGIN`/`END` markers, preserving everything above and below. |
| 2026-08-08 | Reply rules go first | The reply-style and core/plumbing rules sit at the very top of `AGENTS.md`, above the Next.js block, as the highest-priority instruction. |
| 2026-08-08 | Session ritual | `PROGRESS.md` is updated at the end of every session, unprompted. Rule lives in `AGENTS.md`. |
| 2026-08-08 | Git workflow | Always branch off `main` (`feat/<kebab-description>`), Conventional Commits with plain-English reasoning in the body, PR against `main`, then post-merge cleanup once Sauel confirms the merge and green CI. Branch, commit, push, and PR are standing-authorised; merging is his. |
| 2026-08-08 | Review threads | Inline PR comments get verified against the code first, fixed or skipped with a stated reason, replied to with the fixing commit, and then always resolved. Rule lives in `.claude/rules/git-workflow.md`. |
| 2026-08-08 | Rules layout | Modular files: rules live in `.claude/rules/*.md`, which Claude Code discovers recursively and loads at launch with the same priority as `.claude/CLAUDE.md`. **No `@`-import needed.** Corrected on PR #1 after CodeRabbit flagged the redundant import — the original entry was recorded on bad information from Claude. Rules also accept `paths:` frontmatter to scope loading to matching files. |
| 2026-08-08 | Progress batching | `PROGRESS.md` updates accumulate and ship as one `docs/` PR at session end, rather than a PR per edit. |
| 2026-08-12 | Harness split | Static yes/no decisions live in `permissions` (deny all MCP tools, deny `.env` read/write, allow the four verification commands); hook scripts exist only where a decision needs code. Hooks live in `.claude/hooks/`, pointed at by `settings.json`. |
| 2026-08-12 | Hooks implemented | Five scripts, all live: `branch-guard` and `bash-branch-guard` (PreToolUse) deny edits and mutating shell commands on `main`; `post-edit` (PostToolUse) formats then lints every written file, feeding lint errors back to Claude; `stop-check` (Stop) runs typecheck + lint before a turn can end, failing closed on discovery errors; `reply-style` (UserPromptSubmit) re-injects the reply rule every prompt. |
| 2026-08-12 | Commit signing | SSH signing with `~/.ssh/id_ed25519`, key registered on GitHub as a Signing Key. Verified end to end — GitHub reports `verified: true` on PR #3's commits. |
| 2026-08-12 | Contributor listing | The `Co-Authored-By` trailer makes Claude show under Contributors on GitHub. Kept deliberately: it marks which commits were Claude-authored, part of demonstrating the harness. |

---

## Open

- **No GitHub Actions workflow yet.** CodeRabbit does review PRs — it's a GitHub App configured on the account rather than in the repo — so there *is* a review gate, just not a test/lint/typecheck one. "Wait for green CI" currently means CodeRabbit alone.
- **Sandbox hardening** — CodeRabbit flagged on PR #3 that `Read`/`Edit` deny rules don't stop Bash subprocesses from reading `.env`. The real fix needs OS-level sandboxing (`sandbox.filesystem.denyRead`), which changes how every shell command runs and would also block `next build`'s legitimate env loading. Deferred as Sauel's call; the Bash branch guard narrows the gap meanwhile.
- **Migration guard** — a PreToolUse deny on edits to applied migration files, once Drizzle exists.
- **Slash commands and subagents** — which recurring workflows are worth encoding.
- **Affected tests in `stop-check`** — once Vitest lands. Playwright and Lighthouse go to CI, never to hooks.
- **TMDB attribution** — required by their terms for non-commercial use. Needs a home in the UI once there is one.

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
- [x] Shipped PR #3 (`af13c48`) — the harness: permissions (MCP and `.env` denied, verification commands allowed) plus five hooks, each pipe-tested on allow/deny/malformed-input paths and proven live in-session (MCP tools vanished on reload; the formatter rewrote a mis-spaced file through the real pipeline).
- [x] Worked CodeRabbit's four findings on PR #3: fail-closed discovery in `stop-check`, surfaced `next typegen` failures, new Bash branch guard closing the shell escape on `main`; skipped sandbox denies with the reason in the thread. All threads replied to and resolved.
- [x] Learned the hard way that `next typegen` must run before `tsc --noEmit` on a never-built tree — Next 16 generates `LayoutProps` and friends into `.next/types`.

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
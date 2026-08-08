# Typecast — Progress

Running log of where the project stands, what's been decided, and what's still open.

**Phase:** Claude Code configuration. No application code written yet.

---

## Decided

| Date | Decision | Detail |
| --- | --- | --- |
| 2026-08-08 | Config scope | This pass covers *how we work* only — collaboration norms, verification, permissions, hooks. Directory and file-layout conventions are deferred until after the system design, so they're decisions rather than guesses. |
| 2026-08-08 | Interaction mode | Explain-first on the core (autocomplete, caching, a11y, ranking, system design); build-then-offer-depth on plumbing (config, CI, migrations, deps). Replies concise, plain English, on-topic. |
| 2026-08-08 | Hooks posture | Full gauntlet — format on edit, typecheck + lint + affected tests on stop, `PreToolUse` guard on sensitive paths. Not yet implemented. |
| 2026-08-08 | Rules location | Project instructions live in `AGENTS.md` around the Next.js managed block. Verified safe: `next dev` only rewrites text between its `BEGIN`/`END` markers, preserving everything above and below. |
| 2026-08-08 | Reply rules go first | The reply-style and core/plumbing rules sit at the very top of `AGENTS.md`, above the Next.js block, as the highest-priority instruction. |
| 2026-08-08 | Session ritual | `PROGRESS.md` is updated at the end of every session, unprompted. Rule lives in `AGENTS.md`. |
| 2026-08-08 | Git workflow | Always branch off `main` (`feat/<kebab-description>`), Conventional Commits with plain-English reasoning in the body, PR against `main`, then post-merge cleanup once Sauel confirms the merge and green CI. Branch, commit, push, and PR are standing-authorised; merging is his. |
| 2026-08-08 | Review threads | Inline PR comments get verified against the code first, fixed or skipped with a stated reason, replied to with the fixing commit, and then always resolved. Rule lives in `.claude/rules/git-workflow.md`. |
| 2026-08-08 | Rules layout | Modular files: rules live in `.claude/rules/*.md`, which Claude Code discovers recursively and loads at launch with the same priority as `.claude/CLAUDE.md`. **No `@`-import needed.** Corrected on PR #1 after CodeRabbit flagged the redundant import — the original entry was recorded on bad information from Claude. Rules also accept `paths:` frontmatter to scope loading to matching files. |

| 2026-08-08 | Progress batching | `PROGRESS.md` updates accumulate and ship as one `docs/` PR at session end, rather than a PR per edit. |

---

## Open

- **No GitHub Actions workflow yet.** CodeRabbit does review PRs — it's a GitHub App configured on the account rather than in the repo — so there *is* a review gate, just not a test/lint/typecheck one. "Wait for green CI" currently means CodeRabbit alone.
- **Commit signing** — commits are unverified. `gpg` isn't installed on this machine and git has no signing config. Plan is SSH signing with the existing `~/.ssh/id_ed25519`, which needs registering on GitHub a second time as a *Signing Key*. Sauel is handling it.
- **Permissions** — what to auto-allow in `settings.json` so the full-gauntlet hooks don't drown in prompts.
- **Slash commands and subagents** — which recurring workflows are worth encoding.
- **`PreToolUse` guard scope** — which paths are off-limits (`.env*` and migrations are the obvious candidates).
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

---

## Notes

`.claude/` currently holds empty `CLAUDE.md` placeholders in `agents/`,
`commands/`, `hooks/`, `rules/`, and `skills/`. These are intentional
scaffolding, filled in as research progresses. They are inert — Claude Code
does not load `CLAUDE.md` from those paths.

Of those five directories, `agents/`, `commands/`, `skills/`, and `rules/` are
all read natively. Only `hooks/` is pure convention — it's a place to keep
scripts that `settings.json` points at by path.

Rules in `.claude/rules/*.md` are discovered recursively and load at launch with
the same priority as `.claude/CLAUDE.md`. Adding `paths:` frontmatter scopes a
rule to matching files, so it only enters context when Claude reads them — the
mechanism for keeping situational instructions out of every turn.
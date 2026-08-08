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
| 2026-08-08 | Rules layout | Settled in favour of modular files: rules live in `.claude/rules/*.md` and are pulled in by `@`-import from `AGENTS.md`. Same context cost as one file, better to edit and diff per topic. |

---

## Open

- **CI does not exist yet.** The git rule says "wait for green CI," but there is no GitHub Actions workflow. That gate is aspirational until one is written.
- **Permissions** — what to auto-allow in `settings.json` so the full-gauntlet hooks don't drown in prompts.
- **Slash commands and subagents** — which recurring workflows are worth encoding.
- **`PreToolUse` guard scope** — which paths are off-limits (`.env*` and migrations are the obvious candidates).
- **TMDB attribution** — required by their terms for non-commercial use. Needs a home in the UI once there is one.

---

## Done

- [x] Verified `AGENTS.md` is safe to edit — `next dev` preserves everything outside its managed markers (`node_modules/next/dist/server/lib/generate-agent-files.js`).
- [x] Fixed `.claude/settings.json` and `.claude/settings.local.json` — were empty files, which is invalid JSON, not empty config.
- [x] Gitignored `.claude/settings.local.json` and `CLAUDE.local.md` as personal, non-shared files.
- [x] Wrote the project context, interaction rules, and constraints into `AGENTS.md`.
- [x] Restructured `AGENTS.md` so the reply rules sit at the top, above the Next.js managed block. Confirmed intact afterwards with Next's own `hasCurrentAgentRules()`.
- [x] Created `PROGRESS.md` and added the end-of-session update rule to `AGENTS.md`.

---

## Notes

`.claude/` currently holds empty `CLAUDE.md` placeholders in `agents/`,
`commands/`, `hooks/`, `rules/`, and `skills/`. These are intentional
scaffolding, filled in as research progresses. They are inert — Claude Code
does not load them from those locations.

Of those five directories, only `agents/`, `commands/`, and `skills/` are read
natively. `hooks/` is just a place to keep scripts that `settings.json` points
at; `rules/` only loads if `AGENTS.md` explicitly imports from it.
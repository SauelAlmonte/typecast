# How you reply — highest priority

Replies are concise, plain English, and confined to the question asked. No
preamble, no restating the question, no summarising what was just said. Length
comes from substance, never from framing.

Two modes, split by area.

**Core — explain first.** Autocomplete internals, caching, request
cancellation, accessibility, ranking, system design. State the approach, the
tradeoff, and the relevant doc *before* writing code, then wait. Sauel writes
most of this himself; delegating it defeats the point of the project.

**Plumbing — build, then offer depth.** Config, CI, migrations, dependencies,
test setup. Do it, summarise what changed, then offer the reasoning rather than
assuming it's wanted or unwanted.

When it isn't obvious which bucket applies, ask before writing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Typecast

Search-as-you-type, built by hand. Movies are the demo domain; the autocomplete
is the deliverable. This is a learning project — the efficiency stack
(debouncing, cancellation, caching, keyboard navigation, ARIA) is written from
scratch on purpose.

## Stack

Next.js 16.3.0 · React 19.2.8 (React Compiler enabled) · TypeScript · pnpm
11.21.0 · Biome 2.5.7

Planned but not yet installed: Neon + Drizzle, Better Auth, Zod, Upstash Redis,
Vitest, Testing Library, Playwright, MSW.

## Do not add

- **No data-fetching library.** Debounce, request cancellation, and client cache
  are handwritten. That *is* the project.
- **No component library.** The combobox is hand-built, ARIA and keyboard
  navigation included.
- **No paid tiers.** Free tiers only, throughout.

## Verification

```bash
pnpm lint               # biome check
pnpm format             # biome format --write
pnpm exec tsc --noEmit  # no typecheck script exists yet
pnpm build
```

No test runner is installed yet.

## Git workflow

See `.claude/rules/git-workflow.md`. Claude Code discovers `.claude/rules/*.md`
natively at launch, so no import is needed here.

## End of every session

Update `PROGRESS.md` before the session closes, unprompted. Log new decisions
with the date, move finished work to Done, and revise what's still Open.

Treat these as the trigger: Sauel says he's wrapping up or signing off, asks for
a summary of the session, or a meaningful chunk of work lands and the
conversation moves on.

Batch the update into a single `docs/` PR at session end rather than opening one
per edit. Everything else in `.claude/rules/git-workflow.md` still applies.

## Current status

Configuration phase. No application code written — `src/` is the untouched
create-next-app scaffold.

Directory structure is deliberately undecided; it follows the system design,
which hasn't happened yet. Do not invent or assume file-layout conventions.

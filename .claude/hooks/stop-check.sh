#!/bin/sh
# Stop — typecheck + lint the project when Claude finishes a turn, but only
# if something checkable changed (working tree or commits on this branch).
# Exit 2 blocks the stop and feeds the errors back to Claude to fix now.

# stop_hook_active means we're already continuing because this hook blocked
# once — bail out rather than loop forever on an unfixable failure.
again=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).stop_hook_active?"1":"0")}catch{process.stdout.write("0")}})')
[ "$again" = "1" ] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Nothing relevant changed since main → skip the expensive part.
{ git status --porcelain; git diff --name-only main...HEAD 2>/dev/null; } |
  grep -qE '\.(ts|tsx|js|jsx|mjs|cjs|json|css)$' || exit 0

# Next generates global route types (LayoutProps etc.) into .next/types.
# A never-built tree doesn't have them and tsc fails on the scaffold itself.
[ -d .next/types ] || pnpm exec next typegen >/dev/null 2>&1

errs=$(pnpm exec tsc --noEmit 2>&1) || {
  printf 'tsc --noEmit failed:\n%s\n' "$errs" >&2
  exit 2
}
errs=$(pnpm lint 2>&1) || {
  printf 'pnpm lint failed:\n%s\n' "$errs" >&2
  exit 2
}
exit 0

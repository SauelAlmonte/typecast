#!/bin/sh
# Stop — typecheck + lint the project when Claude finishes a turn, but only
# if something checkable changed (working tree or commits on this branch).
# Exit 2 blocks the stop and feeds the errors back to Claude to fix now.

# stop_hook_active means we're already continuing because this hook blocked
# once — bail out rather than loop forever on an unfixable failure.
again=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).stop_hook_active?"1":"0")}catch{process.stdout.write("0")}})')
[ "$again" = "1" ] && exit 0

# A gate that can't see the project must fail closed, not wave work through.
cd "$CLAUDE_PROJECT_DIR" || {
  echo "stop-check: cannot cd to CLAUDE_PROJECT_DIR" >&2
  exit 2
}

# Nothing relevant changed since main → skip the expensive part.
# Discovery failures fail closed for the same reason as above.
status_files=$(git status --porcelain) || {
  echo "stop-check: git status failed" >&2
  exit 2
}
branch_files=$(git diff --name-only main...HEAD) || {
  echo "stop-check: git diff main...HEAD failed" >&2
  exit 2
}
printf '%s\n%s\n' "$status_files" "$branch_files" |
  grep -qE '\.(ts|tsx|js|jsx|mjs|cjs|json|css)$' || exit 0

# Next generates global route types (LayoutProps etc.) into .next/types.
# A never-built tree doesn't have them and tsc fails on the scaffold itself.
# Regenerating every run costs ~7s; next dev keeps them fresh in normal use.
if [ ! -d .next/types ]; then
  errs=$(pnpm exec next typegen 2>&1) || {
    printf 'next typegen failed:\n%s\n' "$errs" >&2
    exit 2
  }
fi

errs=$(pnpm exec tsc --noEmit 2>&1) || {
  printf 'tsc --noEmit failed:\n%s\n' "$errs" >&2
  exit 2
}
errs=$(pnpm lint 2>&1) || {
  printf 'pnpm lint failed:\n%s\n' "$errs" >&2
  exit 2
}
exit 0

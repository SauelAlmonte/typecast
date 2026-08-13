#!/bin/sh
# PostToolUse on Write|Edit — format the file Claude just wrote, then lint it.
# Formatting failures are ignored (a nicety, not a gate). Lint failures exit 2,
# which feeds the errors back into Claude's context to fix immediately.
f=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input.file_path||"")}catch{}})')
[ -n "$f" ] || exit 0
[ -f "$f" ] || exit 0
# Only file types biome handles — on anything else it errors with
# "no files were processed" even with --files-ignore-unknown.
case "$f" in
*.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css) ;;
*) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
pnpm exec biome format --write --files-ignore-unknown=true "$f" >/dev/null 2>&1
errs=$(pnpm exec biome check --files-ignore-unknown=true "$f" 2>&1) || {
  printf 'biome check failed on %s:\n%s\n' "$f" "$errs" >&2
  exit 2
}
exit 0

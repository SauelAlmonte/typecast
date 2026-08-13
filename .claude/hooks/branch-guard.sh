#!/bin/sh
# PreToolUse on Write|Edit — no edits while on main; branch first.
# Files outside the repo (Claude's memory, scratchpad) are none of our business.
f=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input.file_path||"")}catch{}})')
[ -n "$f" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
case "$f" in
"$CLAUDE_PROJECT_DIR"/*) ;; # inside the repo — the guard applies
*) exit 0 ;;
esac
[ "$(git branch --show-current)" = "main" ] || exit 0
printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"On main. Branch first — git checkout -b <type>/<description> (.claude/rules/git-workflow.md)."}}'
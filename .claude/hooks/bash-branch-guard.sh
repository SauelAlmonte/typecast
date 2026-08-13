#!/bin/sh
# PreToolUse on Bash — while on main, deny shell commands that can mutate
# files or history. Read-only commands and the sanctioned post-merge cleanup
# (checkout, pull, fetch, branch -d, push --delete) stay allowed.
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ "$(git branch --show-current)" = "main" ] || exit 0

c=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input.command||"")}catch{}})')
[ -n "$c" ] || exit 0

deny() {
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"On main. Branch first — git checkout -b <type>/<description> (.claude/rules/git-workflow.md)."}}'
  exit 0
}

# History-mutating git and common file mutators.
printf '%s' "$c" | grep -qE '(^|[;&|[:space:]])(rm|mv|cp|touch|mkdir|chmod|ln|tee)[[:space:]]' && deny
printf '%s' "$c" | grep -qE 'sed[[:space:]].*-i' && deny
printf '%s' "$c" | grep -qE 'git[[:space:]]+(commit|merge|rebase|cherry-pick|revert|reset|clean|am|apply|stash)([[:space:]]|$)' && deny

# Redirects write files too. Strip harmless /dev/null and fd-dup forms first.
stripped=$(printf '%s' "$c" | sed -e 's/[0-9]*>&[0-9]*//g' -e 's|[0-9]*>>*[[:space:]]*/dev/null||g')
printf '%s' "$stripped" | grep -q '>' && deny

exit 0
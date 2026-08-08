# Git workflow

Standing authorisation: branch, commit, push, and open the PR without asking.
Merging is Sauel's call. Cleanup waits for his word.

## Before any work that changes files

Branch off `main` first. Never commit directly to `main`.

```bash
git checkout main && git pull
git checkout -b feat/<short-kebab-description>
```

`feat/` is the default prefix. Other Conventional Commit types take the same
shape when they fit better: `fix/`, `chore/`, `docs/`, `refactor/`, `test/`.

This applies to every change, including edits to `PROGRESS.md` and docs.

## Commits

Conventional Commits. Subject line concise and plain English. The body explains
the reasoning — the diff already shows what changed, so say why it changed.

```
feat(autocomplete): cache suggestions by normalised query

Raw-query keys missed obvious repeats like trailing whitespace and case
changes, so the cache barely hit during real typing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

The trailer goes on commits Claude authors, not ones Sauel writes himself.

## Pull requests

Push the branch and open a PR against `main`. The body states what changed and
why in the same plain-English register as the commits, ending with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Then stop. Sauel reviews, waits for CI, and merges.

## Post-merge cleanup

Only once Sauel confirms the PR is merged and CI is green:

```bash
git checkout main
git pull
git branch -d feat/<branch>
git push origin --delete feat/<branch>   # skip if GitHub auto-deleted it
git fetch --prune
```

Confirm `git status` is clean before starting the next branch.

Never begin cleanup on assumption. Wait to be told.

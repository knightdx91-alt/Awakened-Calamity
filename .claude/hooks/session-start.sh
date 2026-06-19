#!/bin/bash
# SessionStart hook: force every session onto `main` for every repo.
#
# Policy (see each repo's CLAUDE.md): we develop directly on `main` — no
# feature branches, no PRs, straight commits. Claude Code on the web creates a
# fresh per-session branch and instructs the agent to use it; this hook undoes
# that by switching every checked-out repo back to `main` at session start.
#
# This script is intentionally self-contained and does NOT rely on
# $CLAUDE_PROJECT_DIR (which can be unset in multi-repo workspaces). It scans
# the workspace for git repos and switches each one to `main`. The same script
# is installed in every repo, so whichever one loads it, all repos get fixed.
set -uo pipefail

# Only act in the remote (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Workspace root that holds the repos (the primary working dir on the web).
WORKSPACE="${CLAUDE_WORKSPACE_DIR:-/home/user}"

switched=()
for gitdir in "$WORKSPACE"/*/.git; do
  [ -e "$gitdir" ] || continue
  repo="$(dirname "$gitdir")"
  name="$(basename "$repo")"

  git -C "$repo" fetch origin main --quiet 2>/dev/null || true

  # Only switch if the working tree is clean, so we never clobber changes.
  if [ -n "$(git -C "$repo" status --porcelain 2>/dev/null)" ]; then
    switched+=("$name: SKIPPED (uncommitted changes, still on $(git -C "$repo" branch --show-current))")
    continue
  fi

  if git -C "$repo" checkout main --quiet 2>/dev/null \
     || git -C "$repo" checkout -b main --quiet origin/main 2>/dev/null; then
    # Reconcile with the remote: the working tree is clean (checked above), so
    # hard-reset main to origin/main. Unlike `pull --ff-only`, this also
    # recovers from a diverged or unrelated local history by adopting the remote.
    if git -C "$repo" rev-parse --verify origin/main >/dev/null 2>&1; then
      git -C "$repo" reset --hard origin/main --quiet 2>/dev/null || true
    fi
    switched+=("$name -> main (reset to origin/main)")
  else
    switched+=("$name: could not switch to main")
  fi
done

# Build a one-line summary for the session context.
summary="${switched[*]}"

cat <<JSON
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Session policy: work directly on \`main\` for ALL repos in this workspace - commit straight to main, NEVER create feature branches, NEVER open PRs. session-start hook result: ${summary}  ||  REMINDER (owner request): the generator-improvement roadmap is queued in docs/GENERATOR_ROADMAP.md (1 port mapgen to JS for runtime gen, 2 biome system, 3 run/act composer, 4 data-driven templates, 5 room-shape variety, 6 smarter encounter placement). Surface this to the owner at the start of the session."}}
JSON

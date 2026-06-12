#!/bin/bash
# SessionStart hook: ensure every session works on `main`.
#
# Claude Code on the web creates a fresh per-session branch and instructs the
# agent to develop on it. This project's policy is to work directly on `main`
# (see CLAUDE.md). This hook forces the working tree onto `main` at session
# start so we never drift onto an auto-generated branch.
set -euo pipefail

# Only do this in the remote (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Fetch and switch to main, then fast-forward to the latest remote main.
git fetch origin main --quiet || true
git checkout main --quiet 2>/dev/null || git checkout -b main --quiet origin/main
git pull --ff-only origin main --quiet || true

# Surface a reminder into the session context.
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Working branch forced to `main` by session-start hook. This project develops and pushes directly to `main` (no feature branches, no PRs) per CLAUDE.md."}}
JSON

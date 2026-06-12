#!/bin/bash
# Sync all maps + layouts from the working tree onto the orphan `maps` branch
# (the branch the map editor's "Load from repo" reads). Uses an isolated git
# worktree so the current branch / working tree is never touched.
#
# Run this after creating or editing any map via the tools/ scripts:
#     bash tools/sync_maps_branch.sh
#
# Maps authored in the in-browser editor already write to `maps` via the GitHub
# API ("Save to repo"); this script covers maps generated locally on `main`.
set -uo pipefail
cd "$(dirname "$0")/.."          # repo root
REPO_ROOT="$(pwd)"
WT="$(mktemp -d)"
BRANCH="maps"

echo "[sync-maps] fetching origin/$BRANCH…"
git fetch origin "$BRANCH" --quiet 2>/dev/null || true

# Attach a worktree on the maps branch (create it from current HEAD if missing).
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git worktree add --quiet "$WT" "$BRANCH" 2>/dev/null \
    || git worktree add --quiet -B "$BRANCH" "$WT" "origin/$BRANCH"
else
  git worktree add --quiet --orphan -B "$BRANCH" "$WT" 2>/dev/null \
    || { git worktree add --quiet --detach "$WT"; (cd "$WT" && git checkout --orphan "$BRANCH" && git rm -rf --quiet . 2>/dev/null || true); }
fi

# Mirror data/maps and data/layouts into the worktree (replace wholesale).
rm -rf "$WT/data/maps" "$WT/data/layouts"
mkdir -p "$WT/data"
cp -r "$REPO_ROOT/data/maps"    "$WT/data/maps"
cp -r "$REPO_ROOT/data/layouts" "$WT/data/layouts"
[ -f "$WT/README_MAPS.md" ] || printf "Orphan storage branch for the map editor (read/written via GitHub API).\nContains only data/maps and data/layouts. Synced by tools/sync_maps_branch.sh.\n" > "$WT/README_MAPS.md"

cd "$WT"
git add -A
if git diff --cached --quiet; then
  echo "[sync-maps] maps branch already up to date — nothing to push."
else
  git commit -q -m "Sync maps + layouts to maps branch for the editor loader"
  for i in 1 2 3 4; do
    git push -u origin "$BRANCH" --quiet && { echo "[sync-maps] pushed."; break; } || sleep $((2**i))
  done
fi

cd "$REPO_ROOT"
git worktree remove --force "$WT" 2>/dev/null || rm -rf "$WT"
echo "[sync-maps] done. Editor 'Load from repo' now lists:"
git ls-tree -r --name-only "origin/$BRANCH" 2>/dev/null | grep -E '^data/maps/.+/.+\.json$' | grep -v '_index' | sed 's#data/maps/#  - #'

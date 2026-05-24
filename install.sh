#!/bin/sh
#
# QAC install script — installs the commit-msg hook into the current repository.
#
# Usage:
#   sh install.sh               # installs to .git/hooks (per-repo, not tracked)
#   sh install.sh --shared      # installs to .githooks and sets core.hooksPath (tracked)

set -e

HOOK_SRC="$(dirname "$0")/enforcement/commit-msg-hook.sh"

if [ ! -f "$HOOK_SRC" ]; then
  echo "Error: enforcement/commit-msg-hook.sh not found."
  echo "Run this script from the root of the qac-spec repository, or copy the hook manually."
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "Error: no .git directory found. Run this script from the root of the target repository."
  exit 1
fi

if [ "$1" = "--shared" ]; then
  mkdir -p .githooks
  cp "$HOOK_SRC" .githooks/commit-msg
  chmod +x .githooks/commit-msg
  git config core.hooksPath .githooks
  echo "QAC: hook installed to .githooks/commit-msg"
  echo "QAC: core.hooksPath set to .githooks"
  echo ""
  echo "Commit .githooks/commit-msg to share the hook with your team."
  echo "Each developer must run: git config core.hooksPath .githooks"
else
  cp "$HOOK_SRC" .git/hooks/commit-msg
  chmod +x .git/hooks/commit-msg
  echo "QAC: hook installed to .git/hooks/commit-msg"
  echo ""
  echo "Note: .git/hooks is not tracked by git. Use --shared to distribute the hook via the repository."
fi

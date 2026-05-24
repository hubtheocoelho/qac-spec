#!/bin/sh
#
# QAC install script — installs the commit-msg hook into the current repository.
#
# Requirements:
#   Linux / macOS : sh (any version)
#   Windows       : Git Bash (included in Git for Windows) or WSL
#   git           : 2.9+
#
# Usage — run from the root of the repository where you want the hook:
#
#   sh /path/to/qac-spec/install.sh               # per-repo, not tracked by git
#   sh /path/to/qac-spec/install.sh --shared      # committed and shared with the team

set -e

# Resolve this script's directory as an absolute path,
# regardless of how the script was invoked (relative, absolute, or via ~).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_SRC="$SCRIPT_DIR/enforcement/commit-msg-hook.sh"

# Verify the hook source file exists.
if [ ! -f "$HOOK_SRC" ]; then
  echo "Error: enforcement/commit-msg-hook.sh not found."
  echo "Expected at: $HOOK_SRC"
  echo ""
  echo "Make sure you are running install.sh from inside the qac-spec repository,"
  echo "or install the hook manually — see enforcement/README.md."
  exit 1
fi

# Verify we are inside a git repository.
# git rev-parse works correctly in standard repos, submodules, and worktrees.
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: not inside a git repository."
  echo "Run this script from the root of the repository where you want to install the hook."
  exit 1
fi

# Resolve the active git directory.
# In a standard repo this is .git; in a worktree it is the worktree-specific path.
GIT_DIR="$(git rev-parse --git-dir)"
GIT_HOOKS_DIR="$GIT_DIR/hooks"

if [ "$1" = "--shared" ]; then
  SHARED_DIR=".githooks"
  mkdir -p "$SHARED_DIR"
  cp "$HOOK_SRC" "$SHARED_DIR/commit-msg"
  chmod +x "$SHARED_DIR/commit-msg"
  git config core.hooksPath "$SHARED_DIR"
  echo "QAC: hook installed to $SHARED_DIR/commit-msg"
  echo "QAC: core.hooksPath set to $SHARED_DIR (local git config)"
  echo ""
  echo "Next steps to share the hook with your team:"
  echo "  git add $SHARED_DIR/commit-msg"
  echo "  git commit -m 'chore: add QAC enforcement hook'"
  echo ""
  echo "Each developer must run once after cloning:"
  echo "  git config core.hooksPath $SHARED_DIR"
else
  mkdir -p "$GIT_HOOKS_DIR"
  cp "$HOOK_SRC" "$GIT_HOOKS_DIR/commit-msg"
  chmod +x "$GIT_HOOKS_DIR/commit-msg"
  echo "QAC: hook installed to $GIT_HOOKS_DIR/commit-msg"
  echo ""
  echo "Note: $GIT_HOOKS_DIR is not tracked by git."
  echo "Use --shared to commit the hook and distribute it to your team."
fi

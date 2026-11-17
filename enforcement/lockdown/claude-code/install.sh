#!/bin/sh
#
# QAC lockdown for Claude Code — makes the QAC MCP server the only way an agent
# can create a commit in this repository.
#
# Run from the root of the repository to lock down:
#
#   sh /path/to/qac-spec/enforcement/lockdown/claude-code/install.sh [--force]
#
# Installs:
#   .claude/settings.json          permission rules + PreToolUse guard registration
#   .claude/hooks/qac-guard.mjs    the guard hook
#   .mcp.json                      the "qac" MCP server, pointing at this qac-spec checkout
#
# Existing files are never overwritten unless --force is given.
# Requires: git, node >= 20, and `npm run setup` already run in qac-spec/mcp-server.

set -e

FORCE=0
[ "$1" = "--force" ] && FORCE=1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QAC_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SERVER_DIR="$QAC_ROOT/mcp-server"
TSX_BIN="$SERVER_DIR/node_modules/.bin/tsx"
SERVER_ENTRY="$SERVER_DIR/src/index.ts"

if ! TARGET="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "Error: not inside a git repository. Run this from the repository to lock down."
  exit 1
fi

if [ ! -x "$TSX_BIN" ] || [ ! -d "$SERVER_DIR/node_modules/@mcp-orchestrator/mcp-server" ]; then
  echo "Error: the QAC MCP server is not set up."
  echo "Run once:  (cd \"$SERVER_DIR\" && npm run setup)"
  exit 1
fi

place() {
  # place <source> <destination>
  if [ -e "$2" ] && [ "$FORCE" -ne 1 ]; then
    echo "Error: $2 already exists. Merge it by hand, or re-run with --force to overwrite."
    exit 1
  fi
  cp "$1" "$2"
}

mkdir -p "$TARGET/.claude/hooks"
place "$SCRIPT_DIR/settings.json" "$TARGET/.claude/settings.json"
place "$SCRIPT_DIR/qac-guard.mjs" "$TARGET/.claude/hooks/qac-guard.mjs"

if [ -e "$TARGET/.mcp.json" ] && [ "$FORCE" -ne 1 ]; then
  echo "Error: $TARGET/.mcp.json already exists. Add the \"qac\" server by hand, or re-run with --force."
  exit 1
fi
# Written with node so paths containing quotes or backslashes stay valid JSON.
node -e '
  const [out, cmd, entry] = process.argv.slice(1);
  const config = { mcpServers: { qac: { command: cmd, args: [entry] } } };
  require("node:fs").writeFileSync(out, JSON.stringify(config, null, 2) + "\n");
' "$TARGET/.mcp.json" "$TSX_BIN" "$SERVER_ENTRY"

echo "QAC lockdown installed in $TARGET"
echo "  .claude/settings.json        permission rules (dontAsk allowlist, shell denied)"
echo "  .claude/hooks/qac-guard.mjs  PreToolUse guard (fail-closed)"
echo "  .mcp.json                    qac MCP server -> $SERVER_ENTRY"
echo ""
echo "Commit these files so every session in this repository starts locked down."
echo "Server-side, also require QAC trailers in CI: local controls do not cover"
echo "commits made outside Claude Code."

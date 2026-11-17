#!/usr/bin/env node
/**
 * QAC lockdown guard — Claude Code PreToolUse hook.
 *
 * Second, independent layer behind the permission rules in settings.json. It
 * runs before every tool call in every permission mode and denies anything that
 * could create, rewrite or un-qualify a commit outside the QAC MCP server:
 *
 *   - shell-executing tools (Bash, PowerShell, Monitor)
 *   - file writes to git internals, hook dirs, Claude Code config and MCP config
 *   - MCP tools other than the allowed QAC tools (a GitHub or git MCP server
 *     can create commits through its own API, skipping QAC entirely)
 *
 * Allowed calls produce no output, so the normal permission rules still decide
 * them; this hook only ever adds denials, never grants.
 *
 * Fail-closed: settings.json registers it with onFailure "block", so a crash,
 * timeout or unparseable payload blocks the tool call instead of letting it run.
 */

import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SHELL_TOOLS = new Set(["Bash", "PowerShell", "Monitor"]);
const WRITE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
const ALLOWED_MCP_TOOLS = new Set(["mcp__qac__qac_commit", "mcp__qac__qac_validate", "mcp__qac__qac_format"]);

/** Project-relative paths an agent must never write. A directory entry covers everything below it. */
const PROTECTED_IN_PROJECT = [".git", ".githooks", ".claude", ".mcp.json"];
/** Home-relative paths an agent must never write. */
const PROTECTED_IN_HOME = [".claude", ".claude.json", ".gitconfig", join(".config", "git")];

const COMMIT_HINT = "Commits must go through the QAC MCP server: call mcp__qac__qac_commit (Agent/Mode/What/Why are required).";

const caseInsensitive = process.platform === "darwin" || process.platform === "win32";
const norm = (p) => (caseInsensitive ? p.toLowerCase() : p);

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `QAC lockdown: ${reason}`,
      },
    }),
  );
  process.exit(0);
}

/** Resolve symlinks through the nearest existing ancestor, so a link cannot smuggle a write into a protected dir. */
function realResolve(p) {
  let current = p;
  const tail = [];
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) return p;
    tail.unshift(basename(current));
    current = parent;
  }
  return join(realpathSync(current), ...tail);
}

function isInside(target, base) {
  const rel = relative(norm(base), norm(target));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function protectedHit(filePath, projectDir) {
  const target = realResolve(resolve(projectDir, filePath));
  const roots = [
    ...PROTECTED_IN_PROJECT.map((p) => join(projectDir, p)),
    ...PROTECTED_IN_HOME.map((p) => join(homedir(), p)),
  ];
  for (const root of roots) {
    const realRoot = existsSync(root) ? realpathSync(root) : root;
    if (isInside(target, realRoot) || isInside(target, root)) return root;
  }
  // Any nested repository's git dir or hooks dir, e.g. vendor/foo/.git/hooks.
  const parts = norm(target).split(sep);
  if (parts.includes(".git") || parts.includes(".githooks")) return target;
  return null;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    deny("could not parse the hook payload; refusing the tool call.");
  }

  const tool = String(payload.tool_name ?? "");
  const input = payload.tool_input ?? {};
  const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();

  if (SHELL_TOOLS.has(tool)) {
    deny(`${tool} is disabled in this repository. ${COMMIT_HINT}`);
  }

  if (WRITE_TOOLS.has(tool)) {
    const filePath = input.file_path ?? input.notebook_path ?? input.path;
    if (typeof filePath !== "string" || filePath === "") {
      deny(`${tool} call without a file path.`);
    }
    const hit = protectedHit(filePath, projectDir);
    if (hit) {
      deny(`writing ${filePath} is not allowed: git internals, hook directories, Claude Code settings and MCP config are protected.`);
    }
  }

  if (tool.startsWith("mcp__") && !ALLOWED_MCP_TOOLS.has(tool)) {
    deny(`${tool} is not an allowed MCP tool here. ${COMMIT_HINT}`);
  }

  process.exit(0);
});

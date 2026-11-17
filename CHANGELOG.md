# Changelog

All notable changes to the QAC specification and tooling are documented here.

## Unreleased

### Tooling

- `mcp-server/` — MCP server that exposes QAC as callable tools (`qac_commit`, `qac_validate`, `qac_format`, `qac_install_hook`), built on the [MCP Orchestrator SDK](https://github.com/hubtheocoelho/mcp_orchestrator_sdk) (vendored under `third_party/` as a git submodule); lets agents produce mechanically-qualified commits instead of hand-writing trailers. Each QAC operation is a tool on an SDK `Orchestrator`, wrapped as a `WorkflowEngine` workflow and served through the SDK's own `McpWorkflowServer` — the server adds no wire plumbing of its own
- `enforcement/lockdown/claude-code/` — Claude Code profile that makes `qac_commit` the agent's only way to commit: shell tools denied, writes to git hooks, git config and Claude Code settings denied, only the QAC MCP tools allowed, plus a fail-closed `PreToolUse` guard that enforces the same allowlist in every permission mode
- `mcp-server/examples/claude-code.mcp.json` — launches the server through its own `tsx` binary instead of `npx tsx`, which could fetch `tsx` from the registry when started from a consuming repository
- `skill/providers/claude-code.md` — documents the `qac_commit` MCP tool as the preferred commit mechanism when the server is connected
- `skill/providers/agents.md` — generic provider for tools that read the AGENTS.md convention (Codex, Jules, and others)
- Claude Code installation now documented as a native Agent Skill (`.claude/skills/qac-commits/SKILL.md`), with the CLAUDE.md @-import kept as an always-on alternative
- `enforcement/commit-msg-hook.sh` — error output now uses `printf` so missing-trailer messages render correctly when the hook runs under bash (Git Bash on Windows, macOS)

## v1.0.0 — 2026-05-23

Initial release.

### Specification

- Four mandatory trailers defined: `Agent`, `Mode`, `What`, `Why`
- Fixed trailer order: Agent → Mode → What → Why
- Two valid `Mode` values: `hitl`, `autonomous`
- Portability guarantee: fixed schema enables identical query patterns across any QAC-compliant repository
- Absence of trailers signals a human commit — no explicit marking required

### Tooling

- `enforcement/commit-msg-hook.sh` — validates all four trailers on agent commits before they land in history
- `skill/SKILL.md` — agent skill compatible with Claude Code, Cursor, Kiro, and any Markdown-based instruction system
- `install.sh` — one-command hook installation with `--shared` option for team distribution

### Examples

- `examples/single-commit.md` — minimal QAC-compliant commit
- `examples/autonomous.md` — `hitl` vs `autonomous` with Mode rationale
- `examples/atomic-sequence.md` — three-commit sequence with commit-level Why granularity

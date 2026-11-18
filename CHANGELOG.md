# Changelog

All notable changes to the QAC specification and tooling are documented here.

## v2.0.0 — unreleased

### Specification — breaking

- `Mode` value `autonomous` renamed to `auto`. Valid values are now `hitl` and `auto`. Commits made under 1.x keep `autonomous`; history is not rewritten, and `--grep="^Mode: auto(nomous)?$"` matches both

### Specification — added

- Each QAC trailer appears exactly once
- No trailer value may be empty, and each trailer fits on a single line: no line breaks or continuation lines
- An optional free-form body may sit between the subject line and the footer; the footer is the last block of the message
- Trailers outside QAC (e.g. `Co-Authored-By`, `Signed-off-by`) may share the footer, before `Agent` or after `Why`, never between the QAC trailers and never in the body
- `Mode` in scheduled or triggered runs (CI, cron, bots): `hitl` only when a human requested that specific change or approved it; a schedule or trigger that leaves the change to the agent yields `auto`
- `hitl` reworded to "a human requested or approved this change": Mode qualifies the change, not the session
- Implementation lists the QAC MCP server's `qac_commit` tool as a third creation mechanism, alongside `git commit --trailer=` and message text

### Migration from 1.x

1. Replace `autonomous` with `auto` in your agents' instructions: reinstall the skill or provider file from `skill/`
2. Reinstall the commit-msg hook (`install.sh`): the 1.x hook rejects `auto`, the 2.0 hook rejects `autonomous`
3. Update saved queries from `^Mode: autonomous` to `^Mode: auto$`, or `^Mode: auto(nomous)?$` for histories that span both versions

### Tooling

- `enforcement/commit-msg-hook.sh` — validates the 2.0 rules: exactly-once trailers, `hitl`/`auto` with a rename hint for `autonomous`, consecutive single-line QAC trailers, footer as the last block. Ignores the comment template and scissors section git passes to the hook when the message is written in an editor. Lists every problem found instead of stopping at the first
- `mcp-server/` — MCP server that exposes QAC as callable tools (`qac_commit`, `qac_validate`, `qac_format`, `qac_install_hook`), built on the [MCP Orchestrator SDK](https://github.com/hubtheocoelho/mcp_orchestrator_sdk) (vendored under `third_party/` as a git submodule); one more creation mechanism next to `git commit --trailer=` and message text, producing the same commit. Each QAC operation is a tool on an SDK `Orchestrator`, wrapped as a `WorkflowEngine` workflow and served through the SDK's own `McpWorkflowServer`. `qac_commit` and `qac_format` accept a `trailers` field for trailers outside QAC, placed after `Why`. `qac_validate` applies the same rules as the hook, with the same messages; `hook-parity.test.ts` runs both over a shared corpus
- `mcp-server/examples/claude-code.mcp.json` — launches the server through its own `tsx` binary instead of `npx tsx`, which could fetch `tsx` from the registry when started from a consuming repository
- `skill/` — skill and all seven providers realigned with the specification and generated from one source, `skill/build.mjs`; `skill/build.test.mjs` fails when a generated file drifts. Fixes from the realignment: `hitl` follows the spec ("requested or approved", not mere presence in an interactive session), the subject line follows the repository convention instead of a hard-coded Conventional Commits template, and the rules missing from some providers are restored (multi-agent attribution, What readable without the subject line, What complementing the subject, numbered plan steps and unversioned documents as external artifacts, English in every provider). The pre-commit checklist covers every rule
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

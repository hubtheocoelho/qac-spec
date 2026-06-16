# Changelog

All notable changes to the QAC specification and tooling are documented here.

## Unreleased

### Specification

- Rule 8 added: the commit message contains only the subject line and the trailer block — no body paragraph. `What` and `Why` replace the conventional body, so reasoning must not be duplicated as free-text prose between the subject and the trailers

### Tooling

- All skill and provider files now instruct agents to emit only the subject line and the trailer block, with no body paragraph in between — addresses agents (across models) inserting a paragraph before the trailers and pushing them out of view
- `enforcement/commit-msg-hook.sh` — rejects agent commits that contain a body paragraph between the subject and the trailer block (git comment lines are ignored; human commits without an `Agent:` trailer are unaffected)
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

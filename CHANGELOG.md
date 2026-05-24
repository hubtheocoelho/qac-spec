# Changelog

All notable changes to the QAC specification and tooling are documented here.

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

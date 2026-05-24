# QAC — Qualified Agent Commits

![Spec](https://img.shields.io/badge/spec-v1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Git](https://img.shields.io/badge/git-2.9%2B-lightgrey)

QAC qualifies every AI agent commit with four git trailers: which agent acted, whether under human supervision, what the change accomplishes, and why it was necessary.

```
feat(auth): add token refresh endpoint

Agent: cursor-ai
Mode: hitl
What: add POST /auth/refresh with JWT rotation and 7-day sliding window
Why: sessions expired silently with no renewal path, forcing users to re-authenticate on every visit
```

The subject line follows your project's existing convention. The trailers live in the footer. `git log --oneline` stays clean — the trailers are available in full when needed.

---

## Trailers

| Trailer | Values | Records |
|---------|--------|---------|
| **Agent** | agent name | which tool executed the commit |
| **Mode** | `hitl` · `autonomous` | whether a human requested or approved the action |
| **What** | free text | the effect of the change, without reading the diff |
| **Why** | free text | the condition that existed and the impact it caused |

All four are mandatory on every agent commit. Absence of trailers signals a human commit — no explicit marking required.

---

## Quick start

**1. Install the skill** — teaches your agent to generate QAC trailers automatically:

| Tool | Step |
|------|------|
| **Claude Code** | add `@skill/providers/claude-code.md` to `CLAUDE.md` |
| **Cursor** | copy `skill/providers/cursor.mdc` → `.cursor/rules/qac-commits.mdc` |
| **Kiro** | copy `skill/providers/kiro.md` → `.kiro/steering/qac-commits.md` |
| **GitHub Copilot** | append `skill/providers/copilot.md` to `.github/copilot-instructions.md` |
| **Windsurf** | append `skill/providers/windsurf.md` to `.windsurfrules` |

See [skill/README.md](skill/README.md) for full details.

**2. Install the enforcement hook** — rejects non-compliant agent commits before they land in history:

```bash
# Clone qac-spec (once, anywhere on your machine)
git clone https://github.com/hubtheocoelho/qac-spec ~/qac-spec

# From your project's root — per-repo (not tracked)
sh ~/qac-spec/install.sh

# Shared with the team (committed to the repository)
sh ~/qac-spec/install.sh --shared
```

See [enforcement/README.md](enforcement/README.md) for manual installation.

---

## Querying

Because QAC fixes the trailer keys, the same query patterns work on any QAC-compliant repository:

```bash
# All autonomous commits
git log --grep="^Mode: autonomous" --extended-regexp

# All commits by a specific agent
git log --grep="^Agent: cursor-ai" --extended-regexp

# Extract the Why from all agent commits
git log --format="%(trailers:key=Why)" | grep -v "^$"

# Autonomous commits from the last month
git log --since="1 month ago" --grep="^Mode: autonomous" --extended-regexp
```

`%(trailers:key=K)` requires git 2.9+. `git commit --trailer=` requires git 2.32+.

---

## Resources

- [Full Specification](SPECIFICATION.md)
- [Examples](examples/)
- [Agent skill](skill/)
- [Enforcement hook](enforcement/)
- [Why QAC](docs/why-qac.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

---

## License

[MIT](LICENSE)

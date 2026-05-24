# QAC — Qualified Agent Commits

A commit message specification for AI agent actions in code repositories.

---

## The problem

When an AI agent makes a commit, the git history records what changed. It does not record which agent acted, whether a human asked or the agent decided alone, or what condition made the change necessary.

QAC fills that gap with four trailers.

---

## Format

```
<subject line following project conventions>

Agent: <agent name>
Mode: <hitl | autonomous>
What: <semantic summary of what was done>
Why: <condition that existed + impact it caused>
```

---

## Example

```
feat(auth): add token refresh endpoint

Agent: cursor-ai
Mode: hitl
What: add POST /auth/refresh with JWT rotation and 7-day sliding window
Why: sessions expired silently with no renewal path, forcing users to re-authenticate on every visit
```

---

## Trailers

| Trailer | Description |
|---------|-------------|
| **Agent** | Name of the agent that executed the commit |
| **Mode** | `hitl` — human requested or approved · `autonomous` — agent acted without human intervention |
| **What** | Effect of the change, not the files touched. Must be understandable without reading the diff |
| **Why** | The condition that existed and the negative impact it caused. Commit-level granularity, not feature-level |

---

## Quick start

### 1. Install the skill

Copy the provider file that matches your tool into your project:

| Tool | Command |
|------|---------|
| **Claude Code** | add `@skill/providers/claude-code.md` to `CLAUDE.md` |
| **Cursor** | `cp skill/providers/cursor.mdc .cursor/rules/qac-commits.mdc` |
| **Kiro** | `cp skill/providers/kiro.md .kiro/steering/qac-commits.md` |
| **GitHub Copilot** | `cat skill/providers/copilot.md >> .github/copilot-instructions.md` |
| **Windsurf** | `cat skill/providers/windsurf.md >> .windsurfrules` |

See [skill/README.md](skill/README.md) for full installation details.

### 2. Install the enforcement hook

Run from the root of your target repository:

```bash
# Per-repo (not tracked by git)
sh path/to/qac-spec/install.sh

# Shared with the team (committed to the repository)
sh path/to/qac-spec/install.sh --shared
```

See [enforcement/README.md](enforcement/README.md) for manual installation.

---

## Querying

QAC-compliant repositories are queryable with standard git commands. Because QAC fixes the trailer keys, the same patterns work on any compliant repository:

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

**Requirements:** `%(trailers:key=K)` requires git 2.9+. `git commit --trailer=` requires git 2.32+.

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

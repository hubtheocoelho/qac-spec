# QAC — Qualified Agent Commits

A commit message specification for AI agent actions in code repositories.

---

## The problem

When an AI agent makes a commit, the git history records what changed. It doesn't record which agent acted, whether a human asked or the agent decided alone, or what condition made the change necessary.

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
| **Why** | The condition that existed and the negative impact it caused. Commit-level granularity, not feature-level. Focus on the problem, not the solution |

---

## Why git trailers?

Trailers are a native git mechanism — structured key-value pairs in the commit footer. Because QAC fixes the trailer keys, the same query patterns work on any QAC-compliant repository without reading its documentation first:

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

---

## Quick start

**1. Configure your agent** — add the [skill](skill/SKILL.md) to teach it to generate QAC-compliant commits automatically.

**2. Install the enforcement hook** — run from the root of your target repository:

```bash
# Per-repo (not tracked)
sh path/to/qac-spec/install.sh

# Shared with the team (tracked in the repository)
sh path/to/qac-spec/install.sh --shared
```

See [enforcement/README.md](enforcement/README.md) for manual installation.

---

## Resources

- [Full Specification](SPECIFICATION.md)
- [Examples](examples/)
- [Enforcement hook](enforcement/)
- [Agent skill](skill/)
- [Why QAC](docs/why-qac.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)

---

## License

[MIT](LICENSE)

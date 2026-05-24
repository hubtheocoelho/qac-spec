---
inclusion: always
name: qac-commits
description: Generate QAC-compliant commit messages for AI agent commits. Apply on every commit — adds the four mandatory trailers (Agent, Mode, What, Why).
---

# QAC Commits

Every commit made by an AI agent must include four trailers in the footer. Apply this rule on every commit — do not skip for small or obvious changes.

## Commit structure

**Via `git commit --trailer=`** (git 2.32+):

```bash
git commit -m "<type>(<scope>): <description>" \
  --trailer="Agent: <agent name>" \
  --trailer="Mode: <hitl | autonomous>" \
  --trailer="What: <semantic summary of what was done>" \
  --trailer="Why: <condition that existed + impact it caused>"
```

**Via commit message text** (any git version):

```
<type>(<scope>): <description>

Agent: <agent name>
Mode: <hitl | autonomous>
What: <semantic summary of what was done>
Why: <condition that existed + impact it caused>
```

## How to generate trailers

**Agent** — use your configured agent name (e.g. `kiro`, `claude-code`, `cursor-ai`).

**Mode**:
- `hitl` — the user requested or approved the action in an interactive session
- `autonomous` — the agent detected the issue and acted without being asked

**What** — describe the effect of the change, not the files touched. One sentence, understandable without reading the diff.

- Good: `add debounce to localStorage writes in useBoard hook`
- Bad: `modify hooks/useBoard.ts`

**Why** — state the condition that existed and the impact it caused. Focus on the problem, not the solution.

- Good: `every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations`
- Bad: `needed to improve performance`

## Rules

- All four trailers are mandatory on every agent commit
- Trailer order is fixed: Agent, Mode, What, Why
- All trailer content in English
- No references to artifacts external to the repository — no chat sessions, no local plan files
- Each trailer must be understandable in isolation
- Why has commit-level granularity — describes this specific commit's justification, not the card or feature goal

## Validation before committing

- [ ] All four trailers present
- [ ] Mode is `hitl` or `autonomous`
- [ ] What describes the effect, not the files
- [ ] Why focuses on the problem, not the solution
- [ ] No references to external artifacts in any trailer

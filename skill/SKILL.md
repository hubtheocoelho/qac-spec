---
name: qac-commits
description: Generate QAC-compliant commit messages for AI agent commits. Use when committing changes made by an AI agent — adds the four mandatory QAC trailers (Agent, Mode, What, Why) to every commit.
---

# QAC Commits

Every commit made by an AI agent must include four trailers in the footer. This skill generates those trailers from the staged changes.

## When to use

Use this skill every time the agent is about to commit. Do not use for human commits — absence of trailers signals a human commit.

## Commit structure

```
<type>(<scope>): <description>

Agent: <agent name>
Mode: <hitl | autonomous>
What: <semantic summary of what was done>
Why: <condition that existed + impact it caused>
```

## How to generate trailers

**Agent** — use your configured agent name (e.g. `claude-code`, `cursor-ai`, `copilot`).

**Mode**:
- `hitl` — if the user requested the change or is present in an interactive session
- `autonomous` — if the agent detected the issue and acted without being asked

**What** — describe the effect of the change, not the files touched. Write one sentence that makes the commit understandable without reading the diff.

  - Good: `add debounce to localStorage writes in useBoard hook`
  - Bad: `modify hooks/useBoard.ts`

**Why** — state the condition that existed and the impact it caused, in one sentence. Focus on the problem, not the solution.

  - Good: `every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations`
  - Bad: `needed to improve performance`

## Rules

- All four trailers are mandatory on every agent commit
- Trailer order is fixed: Agent, Mode, What, Why
- All trailer content in English
- No references to artifacts external to the repository — no chat sessions, no local plan files, no personal notes
- Each trailer must be understandable in isolation
- Why has commit-level granularity — describes this specific commit's justification, not the card or feature goal

## Validation before committing

Check:
- [ ] All four trailers present
- [ ] Mode is `hitl` or `autonomous`
- [ ] What does not describe files — it describes the effect
- [ ] Why does not reference external artifacts
- [ ] Why focuses on the problem, not the solution

## Example

```
refactor(hooks): debounce localStorage writes in useBoard

Agent: claude-code
Mode: hitl
What: add 300ms debounce to localStorage.setItem calls and extract load logic to separate function
Why: every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations
```

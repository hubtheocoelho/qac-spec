# QAC Commits

Every commit made by an AI agent must include four trailers in the footer. Apply this rule on every commit — do not skip for small or obvious changes.

## Commit structure

```
<type>(<scope>): <description>

Agent: <agent name>
Mode: <hitl | autonomous>
What: <semantic summary of what was done>
Why: <condition that existed + impact it caused>
```

Agents running git 2.32+ may equivalently use `git commit --trailer="Agent: ..."` (one flag per trailer) — both produce an identical commit.

## Trailer rules

**Agent** — use your configured agent name (e.g. `claude-code`, `cursor-ai`, `codex`, `copilot`).

**Mode**:
- `hitl` — the user requested or approved the action
- `autonomous` — the agent detected the issue and acted without being asked

**What** — describe the effect, not the files touched. One sentence, understandable without the diff.
- Good: `add debounce to localStorage writes in useBoard hook`
- Bad: `modify hooks/useBoard.ts`

**Why** — the condition that existed and its impact. Focus on the problem, not the solution.
- Good: `every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations`
- Bad: `needed to improve performance`

All four trailers are mandatory. Order is fixed: Agent, Mode, What, Why. The commit message contains only the subject line and the trailer block — no body paragraph between them; What and Why are the body. All trailer content in English. No references to external artifacts (chat sessions, local files). Each trailer must be self-contained. Why has commit-level granularity — it describes this specific commit's justification, not the card or feature goal.

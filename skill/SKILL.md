---
name: qac-commits
description: Generate QAC-compliant commit messages for AI agent commits. Use every time an AI agent is about to commit, adding the four mandatory QAC trailers (Agent, Mode, What, Why).
---

# QAC Commits

Every commit made by an AI agent must carry the four QAC trailers (Agent, Mode, What, Why) in its footer. Apply this on every agent commit, including small or obvious changes: a commit without trailers is read as a human commit.

## When to use

Every time you, as an AI agent, are about to commit. Do not use it for human commits.

## Commit structure

The subject line follows the repository's own commit convention (Conventional Commits or any other). QAC does not change it. The four trailers go in the footer, separated from the subject line by a blank line, in this fixed order:

```
<subject line following the repository convention>

Agent: <agent name>
Mode: <hitl | autonomous>
What: <semantic summary of what was done>
Why: <condition that existed + the impact it caused>
```

QAC fixes the schema, not the creation mechanism. Each of these produces the same commit:

- `git commit --trailer=` (git 2.32+):

  ```bash
  git commit -m "<subject line>" \
    --trailer="Agent: <agent name>" \
    --trailer="Mode: <hitl | autonomous>" \
    --trailer="What: <semantic summary of what was done>" \
    --trailer="Why: <condition that existed + the impact it caused>"
  ```

- The trailers written directly in the commit message text, as in the structure above (any git version).
- The `qac_commit` tool of the QAC MCP server, when it is available.

## Agent

Use the configured name of the agent that executes the commit (e.g. `claude-code`, `cursor-ai`, `github-copilot`). When several agents collaborated, record the one that effectively made the commit.

## Mode

- `hitl`: human-in-the-loop. The user requested or approved the action.
- `autonomous`: the agent decided and executed the action without human intervention.

Only these two values are valid. No extensions or variants.

## What

- Describe the effect of the change, not the files touched.
- It must be understandable without reading the diff or the subject line.
- It complements the subject line, which is limited to 72 characters. Do not just repeat it.

Good: `add debounce to localStorage writes in useBoard hook`
Bad: `modify hooks/useBoard.ts`

## Why

- Unify the condition that existed and its negative impact into a single justification. It answers both "what was the situation?" and "why was that a problem?".
- Focus on the problem, not the solution. The solution belongs in What.
- Commit granularity, not card: justify this specific commit, not the feature or card as a whole. In a sequence of atomic commits for the same card, each commit has its own Why.

Good: `every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations`
Bad: `needed to improve performance`

## Rules for every trailer

- All four trailers are mandatory on every agent commit.
- The order is fixed: Agent, Mode, What, Why.
- All trailer content is in English, following the repository convention.
- No trailer may reference artifacts external to the repository: personal files, chat sessions, local plans or numbered steps from them, unversioned documents.
- Each trailer must be understandable in isolation, without needing another trailer to interpret it.

## Check before every commit

Re-read the message against each item. Fix it before committing if any item fails.

- [ ] The subject line follows the repository convention
- [ ] All four trailers are present, in the footer, after a blank line
- [ ] The order is Agent, Mode, What, Why
- [ ] Agent is the agent that effectively made the commit
- [ ] Mode is exactly `hitl` or `autonomous`, and `hitl` only if the user requested or approved the action
- [ ] What describes the effect, not the files, and reads without the diff or the subject line
- [ ] Why states the condition and its impact for this commit, and does not describe the solution
- [ ] No trailer references chat sessions, local plans, personal files or unversioned documents
- [ ] All trailer content is in English
- [ ] Each trailer is understandable on its own

## Example

```
refactor(hooks): debounce localStorage writes in useBoard

Agent: claude-code
Mode: hitl
What: add 300ms debounce to localStorage.setItem calls and extract load logic to separate function
Why: every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations
```

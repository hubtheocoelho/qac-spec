# QAC Commits

Every commit made by an AI agent must carry the four QAC trailers (Agent, Mode, What, Why) in its footer. Apply this on every agent commit, including small or obvious changes: a commit without trailers is read as a human commit.

## Commit structure

The subject line follows the repository's own commit convention (Conventional Commits or any other). QAC does not change it. An optional free-form body may follow it. The four trailers go in the footer, the last block of the message, separated from what precedes it by a blank line:

```
<subject line following the repository convention>

<optional body>

Agent: cursor-ai
Mode: <hitl | auto>
What: <semantic summary of what was done>
Why: <condition that existed + the impact it caused>
<optional other trailers, e.g. Co-Authored-By>
```

- Agent, Mode, What and Why are consecutive lines, in this order, one line each.
- Nothing comes after the footer.
- Put other trailers (`Co-Authored-By`, `Signed-off-by`, ...) in the same footer, after Why. Never put them between the QAC trailers or in the body. A trailer that git itself places before Agent, such as the `Signed-off-by` of `git commit -s`, is also valid.

QAC fixes the schema, not the creation mechanism. Each of these produces the same commit:

- `git commit --trailer=` (git 2.32+):

  ```bash
  git commit -m "<subject line>" \
    --trailer="Agent: cursor-ai" \
    --trailer="Mode: <hitl | auto>" \
    --trailer="What: <semantic summary of what was done>" \
    --trailer="Why: <condition that existed + the impact it caused>"
  ```

- The trailers written directly in the commit message text, as in the structure above (any git version).
- The `qac_commit` tool of the QAC MCP server, when it is available. Pass other trailers in its `trailers` field, never in `body`.

## Agent

Use `cursor-ai`, the configured name of the agent that executes the commit. When several agents collaborated, record the one that effectively made the commit.

## Mode

- `hitl`: human-in-the-loop. A human requested or approved this change.
- `auto`: autonomous. The agent decided and executed the change without human intervention.

Only these two values are valid. No extensions or variants. Never write `autonomous`: that was the value in QAC 1.x and is now `auto`.

Mode qualifies the change in the commit, not the session that produced it. In a scheduled or triggered run (CI job, cron, bot), use `hitl` only when a human requested that specific change, for example by assigning an issue that names it, or approved it before it was committed. If the schedule or trigger leaves the change to you, as a recurring maintenance job does, use `auto`.

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

- All four trailers are mandatory on every agent commit, each exactly once.
- The order is fixed: Agent, Mode, What, Why, on consecutive lines.
- No value may be empty, and each fits on a single line: no line breaks.
- All trailer content is in English, following the repository convention.
- No trailer may reference artifacts external to the repository: personal files, chat sessions, local plans or numbered steps from them, unversioned documents.
- Each trailer must be understandable in isolation, without needing another trailer to interpret it.

## Check before every commit

Re-read the message against each item. Fix it before committing if any item fails.

- [ ] The subject line follows the repository convention
- [ ] The footer is the last block of the message, after a blank line
- [ ] Agent, Mode, What and Why each appear exactly once, on consecutive lines, in this order
- [ ] Each value is filled in and fits on one line
- [ ] Other trailers, if any, come after Why, never between the QAC trailers or in the body
- [ ] Agent is the agent that effectively made the commit
- [ ] Mode is exactly `hitl` or `auto` (never `autonomous`), and `hitl` only if a human requested or approved this change
- [ ] What describes the effect, not the files, and reads without the diff or the subject line
- [ ] Why states the condition and its impact for this commit, and does not describe the solution
- [ ] No trailer references chat sessions, local plans, personal files or unversioned documents
- [ ] All trailer content is in English
- [ ] Each trailer is understandable on its own

## Examples

```
refactor(hooks): debounce localStorage writes in useBoard

Agent: cursor-ai
Mode: hitl
What: add 300ms debounce to localStorage.setItem calls and extract load logic to separate function
Why: every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations
```

With a body, an autonomous change and another trailer after Why:

```
fix(api): send JSON content type on all requests

The client built headers per call site and three call sites never set it.

Agent: cursor-ai
Mode: auto
What: add Content-Type: application/json to every outgoing request of the api client
Why: requests without a content type were rejected with 415 Unsupported Media Type on POST endpoints with a body
Co-Authored-By: Jane Doe <jane@example.com>
```

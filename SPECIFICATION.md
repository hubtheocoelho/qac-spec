# QAC — Qualified Agent Commits

## Specification v1.0

QAC is a commit message specification for actions performed by AI agents in code repositories. It defines a structured format based on native git trailers that qualifies each commit with traceability metadata: who executed it, under which mode of operation, what was done, and why.

## Problem

AI agents execute actions in code repositories: they create files, modify configurations, refactor structures. These actions generate commits in the git history. A conventional commit records only what changed (diff) and a short description (subject line), but does not preserve the reasoning behind the action.

This creates three gaps:

1. **Traceability** — a human auditing the agent's work cannot distinguish whether an action was requested, autonomous, or reactive, nor what problem motivated the change.

2. **Continuity** — a future agent reading the repository history needs to interpret diffs to reconstruct the project context. Large diffs consume context window and are not always semantically clear — the agent sees the changed lines but does not understand the intent. This leads to hallucination, drift, and excessive token consumption.

3. **Tacit knowledge** — humans compensate for ambiguous commits with memory and implicit context. AI agents have no access to that knowledge. Every ambiguous commit is a context black hole that accumulates and degrades the quality of the agent's work.

## Rationale

Traceability of AI agent actions in code repositories requires that three questions be answerable from the git history, without access to any external source:

- **Who acted and how?** — which agent executed and whether the action was autonomous or human-supervised
- **What was done?** — semantic summary of the change, without depending on reading the diff
- **Why was it done?** — the condition that existed and the impact it caused, justifying the action

Git already provides natively: timestamp, author, diff, and changed files. What is missing is the intent layer — the reasoning that connects the situation to the problem and the problem to the action.

A qualified commit (QAC-compliant) fills that gap with the minimum information necessary and the maximum value for human and agent consumption.

## Format

QAC uses git trailers — a native git mechanism for structured metadata in the commit footer. Trailers are `Key: value` pairs separated from the subject line by a blank line, queryable via `git log --trailer=<key>` without custom tooling.

The subject line remains unchanged, following the project's commit convention (Conventional Commits, or any other). QAC does not interfere with the subject line — the traceability trailers live exclusively in the footer.

### Trailers

Four mandatory trailers, in fixed order:

| Trailer | Description |
|---------|-------------|
| **Agent** | Identification of the agent that executed the commit |
| **Mode** | Mode of operation: `hitl` or `autonomous` |
| **What** | Semantic summary of what was done |
| **Why** | The condition that existed and the impact that justifies the change |

### Structure

```
<subject line following project conventions>

Agent: <agent name>
Mode: <hitl | autonomous>
What: <semantic summary>
Why: <condition + impact>
```

## Granularity

All trailers describe the individual commit, not the card or feature as a whole. In a sequence of atomic commits related to the same card, each commit has its own Why, reflecting the specific condition that commit resolves.

This avoids repetition in the history and preserves the self-contained property — any commit can be read in isolation without depending on prior commits or external systems.

## Rules

### General

1. The four trailers are mandatory on every commit made by an AI agent
2. Trailer order is fixed: Agent, Mode, What, Why
3. All trailer content is in English, following the repository convention
4. No trailer may reference artifacts external to the repository (personal files, chat sessions, local plans, unversioned documents)
5. Each trailer must be understandable in isolation — the reader should not need another trailer to interpret its meaning
6. Absence of trailers indicates a human commit — no explicit marking required for manual commits
7. Trailers are separated from the subject line by a blank line

### Agent

- Configured name of the agent that executed the commit
- When multiple agents collaborated, record the agent that effectively performed the commit

### Mode

- Indicates the mode of operation under which the commit was generated
- `hitl` — human-in-the-loop: user requested or approved the action
- `autonomous` — agent decided and executed without human intervention
- Enables analysis of how AI is being used in the project and the degree of autonomy in changes

### What

- Describes the effect of the change, not the files touched
- Must be understandable without reading the diff or the subject line
- Complements the subject line, which is limited to 72 characters

### Why

- Unifies the condition that existed and the negative impact of that condition into a single justification
- Answers simultaneously "what was the situation?" and "why was that a problem?"
- Commit granularity, not card — describes the specific justification for this commit, not the general context of the feature
- Never reference personal artifacts, numbered steps from local plans, or information that exists only in the chat session
- Focus on the problem, not the solution (the solution is the What trailer)

## Native Querying

Trailers are queryable via native git commands, without scripts or additional tools:

```bash
# List all autonomous commits
git log --trailer="Mode: autonomous"

# List all commits from a specific agent
git log --trailer="Agent: agent-ai"

# Extract the Why from all commits with trailers
git log --format="%(trailers:key=Why)"

# Autonomous commits from the last month
git log --since="1 month ago" --trailer="Mode: autonomous"
```

## Examples

Sequence of three atomic commits on the same card, each with its own Why:

```
CARD-1123 feat(steering): add agent-core orchestration rules

Agent: agent-ai
Mode: hitl
What: create orchestration steering with delegation, language and response logic rules
Why: no steering file exists for IDE, agent has no base behavior rules between sessions
```

```
CARD-1123 refactor(steering): extract delegation rules from agent-core

Agent: agent-ai
Mode: hitl
What: separate MCP delegation rules into dedicated steering section
Why: delegation rules mixed with language and response logic in single block, harder to maintain and override individually
```

```
CARD-1123 docs(steering): add inclusion mode to agent-core frontmatter

Agent: agent-ai
Mode: autonomous
What: add inclusion: always to agent-core.md frontmatter
Why: no inclusion mode declared, IDE does not load the steering automatically without it
```

## References

QAC was developed considering three emerging references in the AI agent traceability ecosystem:

- **Lore Protocol** (arXiv:2603.15566, March 2026) — proposes git trailers as a structured knowledge protocol to preserve the "Decision Shadow". Uses 9 optional trailers including Constraint, Rejected, Confidence, Scope-risk, Reversibility and Directive. Oriented towards architectural decisions at the implementation level.

- **Agentic Commits** (v1.0.0, January 2026) — extends Conventional Commits with the format `type(scope): what (why) → next` in the subject line. Does not identify the agent, does not distinguish mode of operation, and compresses everything into a single line.

- **GitAgentProtocol / Open GAP** (2.7k stars, April 2026) — git-native standard for defining agents as repositories. Does not address commit messages, but validates the ecosystem of agent traceability via git as a market trend.

QAC positions itself between Lore (complete but heavy for atomic commits) and Agentic Commits (lightweight but without agent traceability or mode of operation), focusing on practical traceability and AI usage analysis in projects.

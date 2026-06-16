# QAC — Qualified Agent Commits

## Specification v1.0

QAC is a commit message specification for AI agent actions in code repositories. It defines a fixed schema of four git trailers — `Agent`, `Mode`, `What`, `Why` — that qualifies each commit with traceability metadata: who executed it, under which mode of operation, what was done, and why.

The schema is what distinguishes QAC from ad-hoc trailer usage. Any team can add trailers to commits; teams that choose their own key names produce repositories that are not interoperable with each other. QAC fixes the keys, their order, and the allowed values for `Mode`, making QAC-compliant repositories queryable with the same patterns regardless of the team, tool, or agent that produced them.

## Problem

AI agents execute actions in code repositories: they create files, modify configurations, refactor structures. These actions generate commits in the git history. A conventional commit records only what changed (diff) and a short description (subject line), but does not preserve the reasoning behind the action.

This creates four gaps:

1. **Traceability** — a human auditing the agent's work cannot distinguish whether an action was requested, autonomous, or reactive, nor what problem motivated the change.

2. **Continuity** — a future agent reading the repository history needs to interpret diffs to reconstruct the project context. Large diffs consume context window and are not always semantically clear — the agent sees the changed lines but does not understand the intent. This leads to hallucination, drift, and excessive token consumption.

3. **Tacit knowledge** — humans compensate for ambiguous commits with memory and implicit context. AI agents have no access to that knowledge. Every ambiguous commit is a context black hole that accumulates and degrades the quality of the agent's work.

4. **Schema fragmentation** — teams that adopt git trailers without a shared specification produce divergent schemas. `Agent`, `AI-Agent`, `by`, `authored-by` all attempt to record the same information with different keys. Without a standard, every repository requires custom inspection to determine its query patterns, and cross-repository analysis is not possible.

## Rationale

Traceability of AI agent actions in code repositories requires that three questions be answerable from the git history, without access to any external source:

- **Who acted and how?** — which agent executed and whether the action was autonomous or human-supervised
- **What was done?** — semantic summary of the change, without depending on reading the diff
- **Why was it done?** — the condition that existed and the impact it caused, justifying the action

Git already provides natively: timestamp, author, diff, and changed files. What is missing is the intent layer — the reasoning that connects the situation to the problem and the problem to the action.

A QAC-compliant commit fills that gap with the minimum information necessary. Because the schema is fixed by the specification — not by the team, not by the agent, not by the toolchain — any developer or agent who knows the QAC spec can read and query any QAC-compliant repository using the same commands, without inspecting the project's own documentation first.

## Format

QAC uses git trailers — a native git mechanism for structured key-value pairs in the commit footer, separated from the subject line by a blank line. The specification defines exactly four trailer keys. No custom tooling is required to read or write them; they are plain text in the commit message.

The subject line remains unchanged, following the project's commit convention (Conventional Commits, or any other). QAC does not interfere with the subject line — the traceability trailers live exclusively in the footer.

A QAC commit message contains only the subject line and the trailer block — nothing in between. The `What` and `Why` trailers replace the conventional commit body: there is no free-text paragraph between the subject and the trailers. Any reasoning that would have gone into a body belongs in `What` (the effect) and `Why` (the condition and impact), keeping the footer clean and the history uniformly queryable.

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

## Implementation

QAC defines the schema — the four keys, their meaning, their order, and the allowed values for `Mode`. The creation mechanism is the developer's choice. Both approaches produce an identical commit object in git:

**Via `git commit --trailer=`** (git 2.32+) — git handles trailer formatting natively:

```bash
git commit -m "feat(auth): add token refresh endpoint" \
  --trailer="Agent: claude-code" \
  --trailer="Mode: hitl" \
  --trailer="What: add POST /auth/refresh with JWT rotation and 7-day sliding window" \
  --trailer="Why: sessions expired silently with no renewal path, forcing users to re-authenticate on every visit"
```

**Via commit message text** (any git version) — trailers written directly in the description:

```
feat(auth): add token refresh endpoint

Agent: claude-code
Mode: hitl
What: add POST /auth/refresh with JWT rotation and 7-day sliding window
Why: sessions expired silently with no renewal path, forcing users to re-authenticate on every visit
```

Both approaches produce the same trailer block in the commit footer. The enforcement hook, querying commands, and format placeholders work identically regardless of which was used.

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
8. The commit message contains only the subject line and the trailer block — no body paragraph. `What` and `Why` replace the conventional body; reasoning must not be duplicated as free-text prose between the subject and the trailers

### Agent

- Configured name of the agent that executed the commit
- When multiple agents collaborated, record the agent that effectively performed the commit

### Mode

- `hitl` — human-in-the-loop: user requested or approved the action
- `autonomous` — agent decided and executed without human intervention
- Only these two values are valid; no extensions or variants

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

## Portable Querying

Git trailers are queryable using `git log`'s native `--grep` flag and `%(trailers:key=<K>)` format placeholder. No additional tooling, scripts, or extensions are required.

The portability guarantee comes from the schema, not from a dedicated git feature. Because QAC fixes the trailer keys and the exact values for `Mode`, the same `--grep` pattern works identically on any QAC-compliant repository:

```bash
# All autonomous commits
git log --grep="^Mode: autonomous" --extended-regexp

# All commits from a specific agent
git log --grep="^Agent: agent-ai" --extended-regexp

# Extract the Why from all agent commits
git log --format="%(trailers:key=Why)" | grep -v "^$"

# Autonomous commits from the last month
git log --since="1 month ago" --grep="^Mode: autonomous" --extended-regexp
```

Teams that adopt git trailers without a schema standard produce divergent key names across repositories. QAC eliminates that divergence: the keys are defined by the spec, not by each team independently. A developer or agent encountering a QAC-compliant repository for the first time can query it immediately, without reading its documentation.

**Version requirements:** `%(trailers:key=<K>)` requires git 2.9. The `valueonly` format option requires git 2.22.

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

- **Lore Protocol** (arXiv:2603.15566, March 2026) — proposes git trailers as a structured knowledge protocol to preserve the "Decision Shadow". Uses 9 optional trailers with team-defined keys including Constraint, Rejected, Confidence, Scope-risk, Reversibility and Directive. Because keys are not standardized across projects, Lore repositories require per-project query configuration. Oriented towards architectural decisions at the implementation level.

- **Agentic Commits** (v1.0.0, January 2026) — extends Conventional Commits with the format `type(scope): what (why) → next` in the subject line. Does not identify the agent, does not distinguish mode of operation, and produces no structured trailer schema — eliminating the possibility of trailer-based querying entirely.

- **GitAgentProtocol / Open GAP** (2.7k stars, April 2026) — git-native standard for defining agents as repositories. Does not address commit messages, but validates the ecosystem of agent traceability via git as a market trend.

QAC positions itself between Lore (deep but without a fixed schema — heavy for atomic commits and non-portable across repositories) and Agentic Commits (lightweight but with no agent attribution, no mode of operation, and no queryable structure), with a fixed four-key schema that is both minimal enough for atomic commits and specific enough to enable portable querying across any compliant repository.

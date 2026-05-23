---
title: "Introducing QAC: a commit message specification for AI agents"
published: false
tags: git, ai, devops, webdev
---

AI agents already write code, create files, refactor modules, and make commits. This is the daily workflow of anyone using Cursor, Claude Code, Copilot, Kiro, or any IDE with an integrated agent. The problem is that when you review the git history afterwards, you cannot distinguish what the agent did on its own from what you asked it to do — and you cannot determine why it made each change.

I work in QA and software quality engineering. Part of my work is ensuring traceability — knowing who did what, when, and why. When I started using AI agents intensively in my development workflow, I noticed that `git log` had become a black box. The commits were there, the diffs were there, but the intent had disappeared.

A `feat(auth): add token refresh endpoint` records what changed. It does not record whether the agent acted autonomously or was explicitly asked. It does not record what condition in the code made that change necessary. And if you need to audit the agent's work three months later — or if another agent needs to read that history to understand the project — there is no way to reconstruct the reasoning from the commit alone.

> The specification described in this article is published at [github.com/hubtheocoelho/qac-spec](https://github.com/hubtheocoelho/qac-spec).

## The tacit knowledge gap

When a developer reads `refactor: clean up utils`, they interpret it with context: the conversation with a colleague, the bug from last Friday, the module that has been confusing since the last sprint. They fill in the gaps with tacit knowledge — information that exists in their head and nowhere in the repository.

An AI agent reading the same message has access to none of that. It either reads the entire diff to try to infer the intent, or it constructs a plausible explanation that may be incorrect. Both paths have a cost — the first in tokens, the second in precision.

The cost compounds over time. An agent reconstructing the chronology of a feature across 50 diffs consumes significant context and still risks misinterpreting the intent. Reading 50 semantic summaries with explicit justifications produces the same understanding at a fraction of the cost.

Ambiguous commits are functional for humans because we compensate with memory and implicit context. For AI agents, each ambiguous commit is a gap that accumulates silently. A clear, structured history is a way to give the agent durable context without any additional infrastructure — just the git repository that already exists.

## Prior work and its trade-offs

In January 2026, Agentic Commits introduced an extension of Conventional Commits that adds the "why" and the "next step" in the subject line: `type(scope): what (why) → next`. The format is lightweight and requires no tooling changes.

The trade-offs are significant. It does not identify which agent made the commit. It does not record whether the action was autonomous or directed. And compressing the "why" into the 72-character subject line forces simplifications that reduce its value: `feat(auth): add token refresh (sessions expire)` tells a reviewer nothing they could not have inferred from the diff.

In March 2026, "Lore: Repurposing Git Commit Messages as a Structured Knowledge Protocol for AI Coding Agents" was published on arXiv. The diagnosis is accurate: every commit discards the reasoning behind the decision — what the authors call the "Decision Shadow". Lore proposes native git trailers to preserve constraints, rejected alternatives, confidence level, blast radius, reversibility, directives, and test coverage. Nine optional trailers, with a dedicated CLI for querying.

Lore is designed for architectural decisions at the implementation level, where the depth of each field is justified. In projects with atomic commits — where each commit is small and focused — most Lore fields would be empty or repetitive on the majority of commits. The dedicated CLI introduces an adoption dependency that does not exist in the standard git toolchain.

Neither approach addresses a question that is increasingly relevant in AI-assisted development: **was this change made autonomously by the agent, or under human supervision?**

## The mode of operation field

With the EU AI Act coming into force in 2026 and AI governance discussions accelerating across engineering organizations, recording whether a change was autonomous or supervised is not a minor detail — it is information that audit trails, incident reviews, and compliance workflows will need.

The existing tooling does not record this. `git blame` shows the author, but most agents commit under the developer's credentials, making blame indistinguishable between human and agent actions. Even when an agent has its own author identity, the author field does not say whether the agent acted on a user's request or made the decision independently.

The **Mode** field records this directly. Two values: `hitl` (human-in-the-loop — the user requested or approved the action) and `autonomous` (the agent decided and executed without intervention). Together with the **Agent** field identifying the specific tool, these two fields make agent actions fully attributable.

## Design: four trailers

The starting point for QAC was a structured log for agent actions with timestamp, decision type, context, motivation, result, tags, and validation checks. The design problem was reducing that to what is actually missing from a commit, not what would be useful to have.

Git already provides natively: timestamp, author, diff, and the list of changed files. The subject line — following Conventional Commits or any equivalent convention — provides change type, scope, and a short description. Removing everything already covered leaves four fields:

**Agent** — which agent executed the commit. Identifies the tool, not the human operating it.

**Mode** — `hitl` or `autonomous`. The degree of human supervision over the action.

**What** — semantic summary of the change's effect. Allows agents and reviewers to understand the change without reading the diff. The diff records which lines changed; the What records what the change accomplishes.

**Why** — the condition that existed before the change and the impact that condition caused. Not the "why of the feature" but the why of this specific commit. In a sequence of atomic commits on the same card, each commit has its own Why describing the specific condition it resolves.

The format uses git trailers — a native mechanism for structured key-value pairs in the commit footer, queryable with `git log` without custom tooling or extensions.

## In practice

A complete QAC commit:

```
feat(auth): add token refresh endpoint

Agent: cursor-ai
Mode: hitl
What: add POST /auth/refresh with JWT rotation and 7-day sliding window
Why: sessions expired silently with no renewal path, forcing users to re-authenticate on every visit
```

The subject line is unchanged from any Conventional Commits workflow. The trailers add four lines in the footer. Reading `git log --oneline`, the trailers are invisible. They are available in full when needed.

A three-commit sequence on the same card, each with a distinct Why:

```
CARD-1123 feat(steering): add agent-core orchestration rules

Agent: claude-code
Mode: hitl
What: create orchestration steering with delegation, language and response logic rules
Why: no steering file exists for IDE, agent has no base behavior rules between sessions
```

```
CARD-1123 refactor(steering): extract delegation rules from agent-core

Agent: claude-code
Mode: hitl
What: separate MCP delegation rules into dedicated steering section
Why: delegation rules mixed with language and response logic in single block, harder to maintain and override individually
```

```
CARD-1123 docs(steering): add inclusion mode to agent-core frontmatter

Agent: claude-code
Mode: autonomous
What: add inclusion: always to agent-core.md frontmatter
Why: no inclusion mode declared, IDE does not load the steering automatically without it
```

The third commit carries `Mode: autonomous` — the agent detected the missing frontmatter and corrected it without being asked. This distinction is recorded in the history permanently and is queryable at any point.

## Specification rules

The complete rules are in the repository. The key constraints:

1. All four trailers are mandatory on every commit made by an AI agent
2. Trailer order is fixed: Agent, Mode, What, Why
3. Trailer content is in English, following the repository's commit convention
4. No trailer may reference artifacts external to the repository — personal files, chat sessions, local plans. Every trailer must be interpretable by someone with access only to the git repository
5. Each trailer is self-contained — does not require reading another trailer to be understood
6. Absence of trailers indicates a human commit. No explicit marking is needed for manual commits
7. Why has commit granularity, not card or feature granularity. Each commit records the specific condition it resolves

### Agent
The configured name of the agent. When multiple agents collaborate, record the one that executed the commit.

### Mode
`hitl` — the user requested or approved the action in an interactive session.
`autonomous` — the agent decided and executed without human intervention.

### What
The effect of the change, not the files touched. Complements the subject line, which is limited to 72 characters. Must be understandable without reading the diff.

### Why
The condition that existed and its negative impact, expressed in a single statement. Focus on the problem, not the solution — the solution is in the What.

## Native querying

Git trailers are queryable with standard git commands, without additional tooling:

```bash
# All autonomous commits
git log --grep="^Mode: autonomous" --extended-regexp

# All commits from a specific agent
git log --grep="^Agent: claude-code" --extended-regexp

# Extract the Why from all commits
git log --format="%(trailers:key=Why)" | grep -v "^$"

# Autonomous commits from the last month
git log --since="1 month ago" --grep="^Mode: autonomous" --extended-regexp
```

## Field count rationale

Lore's nine fields — Constraint, Rejected, Confidence, Scope-risk, Reversibility, Directive, Tested, Not-tested, Related — carry real value for architectural decisions where each field has meaningful content to record.

The design principle for QAC is different: include only fields that carry information not available elsewhere in the commit. If git provides it natively, do not duplicate it. If the subject line covers it, do not repeat it. Each of the four QAC trailers records something that would otherwise be absent from the commit entirely.

## What comes next

QAC was developed to address a practical need: tracing what AI agents were doing in a repository, with enough context to audit their decisions. The specification is published and open for adoption at [github.com/hubtheocoelho/qac-spec](https://github.com/hubtheocoelho/qac-spec).

The repository includes a commit-msg hook that validates all four trailers before a commit is recorded, and a skill file that instructs agents to generate QAC-compliant commits automatically — compatible with Claude Code, Cursor, Kiro, and any agent that reads Markdown instruction files.

Four extra lines per commit. The traceability benefit is proportional to the consistency of adoption.

---

*The QAC Specification, enforcement hook, and agent skill are at [github.com/hubtheocoelho/qac-spec](https://github.com/hubtheocoelho/qac-spec).*

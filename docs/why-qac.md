# QAC — Qualified Agent Commits: your AI agents make commits. Do you know why?

AI agents already write code, create files, refactor modules, and make commits. This is not the future — it is the daily workflow of anyone using Cursor, Claude Code, Copilot, Kiro, or any IDE with an integrated agent. The problem is that when you look at the git history afterwards, you cannot distinguish what the agent did on its own from what you asked it to do. And worse: you cannot understand why it did it.

I work in QA and software quality engineering. Part of my job is ensuring traceability — knowing who did what, when, and why. When I started using AI agents intensively in my development workflow, I noticed that `git log` had become a black box. The commits were there, the diffs were there, but the intent had disappeared.

A `feat(auth): add token refresh endpoint` tells me what changed. It does not tell me whether the agent decided to do this on its own because it detected a problem, or whether I explicitly asked. It does not tell me what condition in the code made that change necessary. And if I need to audit the agent's work three months later — or if another agent needs to read that history to understand the project — there is nothing there to reconstruct the reasoning.

## What we know and AI doesn't

When a dev reads `refactor: clean up utils`, they interpret. They remember the conversation with a colleague, recall the bug that appeared last Friday, know the module has been confusing since the last sprint. They fill in the gaps with tacit knowledge — everything that exists in their head and nowhere in the repository.

AI has no access to any of that. It reads the same message and finds zero context. If it needs to continue the work, it has two options: read the entire diff to try to infer the intent, or hallucinate a plausible explanation. Both are expensive — the first in tokens, the second in quality.

And that cost scales. An agent that needs to reconstruct the chronology of a feature by reading 50 diffs consumes thousands of tokens and still risks misinterpreting. The same agent reading 50 semantic summaries with justifications reconstructs the narrative at a fraction of the cost and with incomparably greater precision. Fewer tokens, less hallucination, less drift.

Ambiguous commits work for humans because we compensate with memory and implicit context. For AI agents, every ambiguous commit is a context black hole that accumulates. The more the history grows, the more the agent gets lost — and the more expensive it becomes to find its way back.

This was the insight that led me to start developing a traceability model: it was not just about auditing or compliance. It was about making agents work better. A clear, structured history is, in practice, a way to give the agent long-term memory without any additional infrastructure — just the git that already exists.

## The market noticed the problem. The solutions don't solve it.

In January 2026, Agentic Commits appeared — an extension of Conventional Commits that adds the "why" and the "next step" directly in the subject line: `type(scope): what (why) → next`. It is elegant, it is simple, and it fits on one line.

But it is superficial. It does not identify which agent made the commit. It does not distinguish whether the action was autonomous or supervised. And compressing the "why" in parentheses in the subject line — which has a 72-character limit — forces simplifications that destroy the value of the information. `feat(auth): add token refresh (sessions expire)` does not explain anything the reviewer could not have inferred from the diff.

In March 2026, the paper "Lore: Repurposing Git Commit Messages as a Structured Knowledge Protocol for AI Coding Agents" was published on arXiv. The diagnosis is precise: every commit discards the reasoning behind the decision — what the authors call the "Decision Shadow". The proposal uses native git trailers to preserve constraints, rejected alternatives, confidence level, blast radius, reversibility, future directives, what was tested, and what was not. That is 9 optional trailers, with a dedicated CLI for querying.

The problem with Lore is that it was designed for architectural decisions at the implementation level. In a real project with atomic commits — where each commit is small and focused — 9 trailers per commit is noise. Most fields would be repetitive or empty. And the adoption barrier is high: it requires a dedicated CLI, requires discipline to fill fields that do not always make sense in the context of an atomic commit.

Neither solves what I needed: practical, lightweight traceability that works with atomic commits and answers a question no one is asking yet but that will be mandatory soon — **did the agent act alone or under human supervision?**

## The field no one thought of

With the EU AI Act coming into force in 2026 and the discussion of AI governance in code accelerating, knowing whether a change was autonomous or supervised is not curiosity — it is a compliance requirement. And today there is no mechanism in git that records this.

`git blame` shows the author. But if the agent commits under the developer's credentials — which is the default in most tools — blame cannot distinguish human from machine. And even when the agent has its own author, knowing that `claude-code` made the commit does not say whether it acted because the dev asked or because it decided alone.

This is the **Mode** field. Two values: `hitl` (human-in-the-loop — the human requested or approved) and `autonomous` (the agent decided and executed without intervention). It sounds simple. It is simple. And it is exactly what is missing.

## QAC: four trailers. Nothing more.

I started with a structure for logging agent actions that had timestamp, decision type, context with input and motivation, result, tags, version, and validation checks. It was complete. And it was completely inadequate for a commit message.

After several iterations cutting what git already provides natively (timestamp, diff, changed files, hash) and what the subject line already covers (change type, scope, description), I arrived at four fields that carry information that exists nowhere else in the commit. The result is QAC — Qualified Agent Commits: a commit message specification that qualifies AI agent actions with the minimum necessary for complete traceability.

**Agent** — which agent executed. Identifies the tool, not the human.

**Mode** — `hitl` or `autonomous`. The degree of human supervision over the action.

**What** — semantic summary of what was done. Exists so future agents do not need to read the entire diff to understand the change. The diff may have hundreds of lines; the What is one sentence that describes the effect.

**Why** — the condition that existed and the impact it caused. Not the "why of the card" or the "why of the feature" — the why of this specific commit. In a card with 10 atomic commits, each one has its own Why, because each one resolves a different condition.

The format uses git trailers — a native git mechanism for structured metadata in the commit footer. No custom parser needed, no dedicated CLI, no extension. `git log --trailer=Mode` already filters all commits by mode of operation.

## In practice

A commit with the complete format:

```
SIM-2283 feat(steering): add nexus-core orchestration rules

Agent: nexus-ai
Mode: hitl
What: create orchestration steering with delegation, language and response logic rules
Why: no steering file exists for IDE, agent has no base behavior rules between sessions
```

The subject line follows the project convention (Conventional Commits, in this case). The trailers live in the footer, separated by a blank line. Four extra lines. Zero friction for whoever reads `git log --oneline` — the trailers do not appear. All the information for whoever needs to audit or reconstruct context.

Three commits on the same card, each with its own Why:

```
SIM-2283 feat(steering): add nexus-core orchestration rules

Agent: nexus-ai
Mode: hitl
What: create orchestration steering with delegation, language and response logic rules
Why: no steering file exists for IDE, agent has no base behavior rules between sessions
```

```
SIM-2283 refactor(steering): extract delegation rules from nexus-core

Agent: nexus-ai
Mode: hitl
What: separate MCP delegation rules into dedicated steering section
Why: delegation rules mixed with language and response logic in single block, harder to maintain and override individually
```

```
SIM-2283 docs(steering): add inclusion mode to nexus-core frontmatter

Agent: nexus-ai
Mode: autonomous
What: add inclusion: always to nexus-core.md frontmatter
Why: no inclusion mode declared, IDE does not load the steering automatically without it
```

The third commit is `autonomous` — the agent detected the missing frontmatter and fixed it without being asked. That distinction is in the history permanently.

## The rules of QAC

For those who want to adopt, the rules are straightforward:

1. The four trailers are mandatory on every commit made by an AI agent
2. Fixed order: Agent, Mode, What, Why
3. Content in English (following the commit convention)
4. No trailer references artifacts external to the repository — personal files, chat sessions, local plans. Everything must be understandable by someone who only has access to git
5. Each trailer is self-contained — does not depend on another trailer to make sense
6. Absence of trailers indicates a human commit. No explicit marking needed
7. Why has commit granularity, not card granularity. Each commit justifies itself

### Agent
Configured name of the agent. When multiple agents collaborate, record the one that effectively executed the commit.

### Mode
`hitl` — human-in-the-loop, user requested or approved the action.
`autonomous` — agent decided and executed without human intervention.

### What
Effect of the change, not files touched. Complements the subject line limited to 72 chars. Must be understandable without reading the diff.

### Why
Condition that existed + negative impact, unified. Focus on the problem, not the solution. The solution is the What.

## Native querying

Without additional tools:

```bash
# All autonomous commits
git log --trailer="Mode: autonomous"

# All commits from a specific agent
git log --trailer="Agent: nexus-ai"

# Extract the Why from all commits
git log --format="%(trailers:key=Why)"

# Autonomous commits from the last month
git log --since="1 month ago" --trailer="Mode: autonomous"
```

This is what makes git trailers superior to any custom format in the body: the query already exists, it is native, and it works in any git repository without setup.

## Why not more fields?

Lore proposes Constraint, Rejected, Confidence, Scope-risk, Reversibility, Directive, Tested, Not-tested, and Related. These are valuable — for architectural decisions. For atomic commits, most of those fields would be empty or repetitive.

The principle here is: if git already provides the information natively, do not duplicate it. If the subject line already covers it, do not repeat it. The four trailers exist because they carry information that is not anywhere else in the commit. Adding more fields without that justification is adding noise.

## What comes next

QAC was born from a practical need: I needed to trace what my agents were doing in my repositories. The specification is published and open for adoption.

The natural next step is: how do you ensure the agent always commits this way? The specification defines the format — but without enforcement, it depends on the goodwill of whoever configures the agent. In the QAC repository you will find practical examples of how to integrate the specification into your agent's workflow: from loading the rules automatically at commit time to validating the trailers before confirming. The agent reads the rules, analyzes the change context, and generates the trailers based on what the specification defines. The validator ensures no agent commit passes without all four trailers.

Four extra lines per commit. Zero cost. The value shows up on the first audit.

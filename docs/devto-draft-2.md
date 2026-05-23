---
title: "QAC in practice: audit trails and governance for AI-assisted teams"
published: false
tags: git, ai, devops, webdev
---

When a single developer runs an AI agent, the gap between what the agent did and what the git history shows is manageable. You remember the session, you know what you asked, and the diffs are small enough to review individually.

When a team of ten developers runs agents across multiple sessions every day, that gap becomes an operational problem. By the end of a sprint, you have hundreds of commits — a significant portion made by agents — and no structured way to answer basic questions: what did the agents change without being asked? Which changes had human review before landing? What condition in the codebase motivated each intervention?

This article covers what QAC trailers unlock at the team level. If you are not familiar with QAC, the [introductory article](https://dev.to/hubtheocoelho/introducing-qac-a-commit-message-specification-for-ai-agents-4opd) covers the specification and design rationale. Here the focus is on what the trailers make possible after they are in place: from daily code review to incident response to governance.

## Four queries every team should run

Git trailers are queryable with standard git commands — no additional tooling, no setup.

> **Minimum versions:** `%(trailers:key=K,valueonly)` requires git 2.22. `%(trailers:key=K)` requires git 2.9. `--grep` and `--extended-regexp` are available in all modern git versions. Run `git --version` to check.

**Separate agent commits from human commits:**

```bash
git log --grep="^Agent:" --extended-regexp --oneline
```

Any commit without an Agent trailer is a human commit. Any commit with one is an agent commit, regardless of whose credentials were used to push it.

**Audit autonomous actions:**

```bash
git log --grep="^Mode: autonomous" --extended-regexp
```

Returns every commit where the agent acted without being asked — detected a problem and corrected it, inferred a missing step and executed it, or completed a task outside the scope of what the user requested. This is the list your incident review starts with.

**Read the project's decision narrative:**

```bash
git log --format="%(trailers:key=Why)" | grep -v "^$"
```

The output is a sequential record of every condition the agents identified as a problem and chose to address. Reading this chronologically is reading the history of what was wrong in the codebase and when it was fixed.

**Scope analysis to a time window:**

```bash
git log --since="2 weeks ago" --grep="^Mode: autonomous" --extended-regexp \
  --format="%s%n%(trailers:key=Why)%n"
```

Replace `"2 weeks ago"` with any period git understands (`"1 month ago"`, `"2026-05-01"`, etc). Sprint review, incident scoping, release notes: any workflow that needs to account for agent activity in a bounded period.

## Why as living documentation

Conventional documentation — READMEs, wikis, ADRs — decays. It is written at a point in time and updated inconsistently, if at all. By the time a new developer joins, or an agent session needs to understand the project's history, the documentation reflects a state of the codebase that may no longer exist.

The Why trailer does not decay. Every commit carries its own motivation, written at the moment the change was made, attached permanently to the diff it describes. A new developer reading the history is not reading a separate document that may be out of date — they are reading the actual sequence of decisions made on the codebase, in order, linked to the exact changes they motivated.

Consider what this sequence communicates:

```
Why: no authentication middleware exists, endpoints are publicly accessible without credentials
Why: middleware existed but applied only to v1 routes, v2 routes were unprotected
Why: middleware was applied to all routes but did not handle token expiry, returning 500 instead of 401
Why: token expiry was handled but refresh logic was missing, forcing full re-authentication on every expiry
```

These are four consecutive Why trailers across four commits. None of them require reading a diff to understand. Together, they tell the story of how authentication was progressively hardened — not as a retrospective write-up, but as a record captured at the time of each change.

The aggregate of Why trailers over a codebase's lifetime is a map of its pain points: what kept breaking, what was missing, what the agents identified as problems worth addressing. This is technical debt made legible without any effort beyond writing the trailer at commit time.

## Context reconstruction for files and the project

The most direct application of structured trailers is context reconstruction — understanding the history of a file or the project without reading diffs.

**File-level:** every decision made on a specific file, in order:

```bash
git log --follow --format="%s%nWhat: %(trailers:key=What,valueonly)%nWhy: %(trailers:key=Why,valueonly)%n" -- src/auth/middleware.ts
```

The output is a readable changelog for that file: every commit that touched it, what the change accomplished, and what condition motivated it. A developer inheriting ownership of a module can run this once and understand the full decision history without opening a single diff.

**Project-level:** reconstructing recent context for a new agent session:

```bash
git log --since="1 month ago" --format="%(trailers:key=What,valueonly)%nWhy: %(trailers:key=Why,valueonly)%n---" | grep -v "^$"
```

A new agent session starting on a repository with QAC history can run this and reconstruct the project's recent evolution in a fraction of the tokens required to read the same period's diffs. A diff for a refactor that touches 20 files may be thousands of lines; the What and Why for that same commit are two sentences. Across a month of active development, this difference is the gap between a session that starts with full project context and one that starts blind.

This is particularly relevant in multi-session and multi-agent workflows, where no single session has continuous context. QAC trailers function as a structured handoff layer — a compressed, queryable record of decisions that persists across session boundaries without relying on external memory or conversation logs.

## Code review with QAC

Code review without context requires the reviewer to reconstruct intent from the diff. For agent-generated code, this reconstruction is often difficult: the agent may have addressed a condition that is not visible in the changed lines, or made a structural decision whose rationale is embedded in the session that produced it.

With QAC trailers, the reviewer sees the motivation before opening the diff:

```
refactor(hooks): debounce localStorage writes in useBoard

Agent: claude-code
Mode: hitl
What: add 300ms debounce to localStorage.setItem calls and extract load logic to separate function
Why: every state change triggered immediate localStorage write causing excessive I/O syscalls during drag operations
```

The What tells them what the change does. The Why tells them what problem it addresses. The reviewer can evaluate whether the approach is correct for the stated problem before examining the implementation. They can also verify that the problem described actually existed — `git blame` on the pre-change code, or a search through prior issues.

The Mode trailer carries additional weight in review. A `hitl` commit means a human was present and directed the change. An `autonomous` commit means the agent made a judgment call. Teams can establish different review thresholds for each mode, applying stricter scrutiny to autonomous changes without blocking the entire review workflow.

## Incident response

When a regression appears in production, the first question is: what changed? The second is: who decided to change it, and why?

Without QAC, answering the second question on an agent-heavy repository requires reading diffs, searching chat logs, and relying on whoever ran the session to remember what they asked. That reconstruction is time-consuming and often incomplete.

With QAC:

```bash
git log --since="2 weeks ago" --grep="^Mode: autonomous" --extended-regexp \
  --format="%h %s%n  Agent: %(trailers:key=Agent,valueonly)%n  Why: %(trailers:key=Why,valueonly)%n"
```

The output is a filtered list of every autonomous agent action in the window, with the agent that performed it and the condition it was responding to. If the regression was introduced by an agent acting without supervision, it appears here. If it was introduced by a directed action, it appears in the `hitl` log.

This distinction matters for two reasons. First, it narrows the search space immediately: you know whether you are looking for a decision made by a human or a judgment call made by an agent. Second, it determines the remediation path: a supervised change that introduced a regression is an error in direction; an autonomous change that introduced a regression is a question of agent oversight and scope.

## Mode as a governance primitive

The Mode trailer — `hitl` or `autonomous` — is a record of the degree of human supervision over every agent action in a repository. Over time, the ratio of `hitl` to `autonomous` commits is a quantitative signal about how the team is operating with AI.

A team where most agent commits are `hitl` is operating with high supervision: agents are tools executing directed tasks. A team where a significant proportion are `autonomous` is operating with higher agent initiative: agents are identifying and addressing problems independently. Neither is inherently right or wrong, but the distinction should be intentional, and it should be visible.

```bash
# Supervision rate over the last quarter
git log --since="3 months ago" --format="%(trailers:key=Mode)" | grep -v "^$" | sort | uniq -c
```

This query produces a count of `hitl` and `autonomous` commits in any time window. Combined with `--grep="^Agent: <name>" --extended-regexp`, it breaks down supervision rate by agent.

The governance argument for this data is straightforward. When something goes wrong in a codebase where agents have been active, the ability to demonstrate which changes were supervised and which were not is the difference between having an audit trail and not having one. Insurance, compliance, and incident review processes increasingly require this distinction. The EU AI Act's requirements on human oversight of AI systems in professional contexts make Mode a field that will be asked for — whether or not it was captured.

The data exists only if it was recorded at commit time. After the fact, there is no reliable way to reconstruct which agent actions were directed and which were autonomous. Mode is information that cannot be recovered retroactively.

## What comes next

The practical value of QAC scales with the consistency of adoption. A repository where half the agent commits have trailers and half do not produces an incomplete audit trail — useful, but not reliable for the workflows described here.

The enforcement hook at [github.com/hubtheocoelho/qac-spec](https://github.com/hubtheocoelho/qac-spec) addresses this: it validates all four trailers before any agent commit is recorded, rejecting commits that are missing fields or have invalid Mode values. Combined with the skill file that instructs agents to generate trailers automatically, the overhead of adoption is minimal.

For teams already using Conventional Commits, QAC adds four lines per commit. For teams that are not, QAC is compatible with any subject line convention — the trailers live in the footer and do not touch the subject line format.

The specification is open at [github.com/hubtheocoelho/qac-spec](https://github.com/hubtheocoelho/qac-spec).

---

*The QAC Specification, enforcement hook, and agent skill are at [github.com/hubtheocoelho/qac-spec](https://github.com/hubtheocoelho/qac-spec).*

# Example: Atomic sequence on the same card

Three atomic commits related to the same card, each with its own Why.

## Scenario

An agent implements an orchestration steering file across three incremental commits: creation, refactor, and documentation fix. All three belong to card CARD-1123.

## Commits

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

## Notes

- Each commit has its own Why describing the specific condition it resolves — not a repeated reference to the card goal
- The third commit is `Mode: autonomous` — the agent detected the missing frontmatter and corrected it without being asked
- Three commits on the same card, three different justifications: this is commit-level granularity
- A future agent reading this sequence reconstructs the full intent without reading a single diff

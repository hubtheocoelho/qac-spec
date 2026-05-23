# Example: Single QAC-compliant commit

A single commit with all four mandatory trailers.

## Scenario

An agent adds a token refresh endpoint after the user asked for it in an interactive session.

## Commit

```
feat(auth): add token refresh endpoint

Agent: cursor-ai
Mode: hitl
What: add POST /auth/refresh with JWT rotation and 7-day sliding window
Why: sessions expired silently with no renewal path, forcing users to re-authenticate on every visit
```

## Notes

- `Mode: hitl` because the user requested the action in an interactive session
- `What` describes the effect (the endpoint and its behavior), not the files touched
- `Why` states the condition (`sessions expired silently`) and its impact (`forcing users to re-authenticate`), not the solution
- Subject line follows the project's Conventional Commits convention and is unchanged by QAC

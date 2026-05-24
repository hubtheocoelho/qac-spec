# Example: Autonomous vs hitl

The `Mode` trailer distinguishes whether a human requested the action or the agent decided alone.

## hitl — human-in-the-loop

The user explicitly asked the agent to create the configuration file.

```
chore(config): add env file support to dev script

Agent: claude-code
Mode: hitl
What: modify dev script to load environment variables from .env using tsx --env-file flag
Why: database connection required env vars to be available during development without manual export before each run
```

## autonomous — agent decided without human input

The agent detected that a required header was missing and fixed it without being asked.

```
fix(config): add missing content-type header to api client

Agent: claude-code
Mode: autonomous
What: add Content-Type: application/json to all outgoing requests in api-client.ts
Why: api client omitted content-type header, causing 415 Unsupported Media Type errors on POST endpoints with request bodies
```

## Why Mode matters

`git blame` shows the author. If the agent commits under the developer's credentials — the default in most tools — blame cannot distinguish human from machine. And even when the agent has its own author, knowing that `claude-code` made the commit does not tell you whether it acted because the developer asked or because it decided alone.

`Mode: autonomous` in the git history is a permanent, queryable record of unsupervised agent actions:

```bash
# Audit all autonomous commits in the last 30 days
git log --since="30 days ago" --grep="^Mode: autonomous" --extended-regexp
```

This matters for code review, incident response, and compliance — any context where knowing the degree of human oversight changes how the change is evaluated.

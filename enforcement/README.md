# QAC Enforcement — commit-msg hook

A git hook that validates QAC trailers on agent commits before they land in history.

## Behavior

- If the commit has **no `Agent:` trailer**, it is treated as a human commit and passes without validation.
- If the commit has an `Agent:` trailer, all four QAC trailers are validated:
  - All four trailers present: `Agent`, `Mode`, `What`, `Why`
  - `Mode` value is `hitl` or `autonomous`
  - No trailer is empty
  - Trailer order is fixed: `Agent`, `Mode`, `What`, `Why`

## Installation

### Per-repository (`.git/hooks`)

```bash
cp enforcement/commit-msg-hook.sh .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

### Shared via `core.hooksPath` (tracked in the repository)

```bash
mkdir -p .githooks
cp enforcement/commit-msg-hook.sh .githooks/commit-msg
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
```

With `core.hooksPath`, the hook is committed and shared with the team. Every developer who clones the repository gets the validation automatically after running `git config core.hooksPath .githooks`.

## Error messages

```
QAC: agent commit rejected — missing required trailers:
  missing trailer: Why

QAC: agent commit rejected — invalid Mode value: 'review'
  Mode must be 'hitl' or 'autonomous'

QAC: agent commit rejected — trailer 'What' is empty

QAC: agent commit rejected — trailers must appear in fixed order: Agent, Mode, What, Why
```

## Bypassing (emergency only)

```bash
git commit --no-verify
```

Use only when the hook itself is broken. Bypassing silently drops QAC validation — the resulting commit will lack trailers or have invalid ones.

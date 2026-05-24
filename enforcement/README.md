# QAC Enforcement — commit-msg hook

A git hook that validates QAC trailers on agent commits before they land in history. Works regardless of how the trailers were created — via `git commit --trailer=` or written directly in the commit message text.

## Requirements

- **Linux / macOS:** any sh
- **Windows:** Git Bash (included in Git for Windows) or WSL — both the install script and the hook require a POSIX shell. The hook itself runs automatically through Git for Windows' bundled `sh.exe` once installed.
- **git:** 2.9+

## Behavior

- If the commit has **no `Agent:` trailer**, it is treated as a human commit and passes without validation.
- If the commit has an `Agent:` trailer, all four QAC trailers are validated:
  - All four trailers present: `Agent`, `Mode`, `What`, `Why`
  - `Mode` value is `hitl` or `autonomous`
  - No trailer is empty
  - Trailer order is fixed: `Agent`, `Mode`, `What`, `Why`

## Installation via install.sh (recommended)

Run from the root of the repository where you want the hook installed:

```bash
# Per-repo — not tracked by git
sh /path/to/qac-spec/install.sh

# Shared with the team — committed to the repository
sh /path/to/qac-spec/install.sh --shared
```

The `--shared` mode installs the hook to `.githooks/commit-msg`, sets `core.hooksPath` in local git config, and prints the next steps to commit and distribute it. Each developer must run `git config core.hooksPath .githooks` once after cloning.

## Manual installation

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
git add .githooks/commit-msg
git commit -m "chore: add QAC enforcement hook"
```

Each developer must run once after cloning:

```bash
git config core.hooksPath .githooks
```

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

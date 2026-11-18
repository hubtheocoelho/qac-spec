# QAC Enforcement — commit-msg hook

A git hook that validates QAC 2.0 trailers on agent commits before they land in history. Works regardless of how the trailers were created — via `git commit --trailer=`, written directly in the commit message text, or through the `qac_commit` tool of the [MCP server](../mcp-server).

## Requirements

- **Linux / macOS:** any sh
- **Windows:** Git Bash (included in Git for Windows) or WSL — both the install script and the hook require a POSIX shell. The hook itself runs automatically through Git for Windows' bundled `sh.exe` once installed.
- **git:** 2.9+

## Behavior

- If the commit has **no `Agent:` trailer**, it is treated as a human commit and passes without validation.
- If the commit has an `Agent:` trailer, the QAC rules are validated:
  - `Agent`, `Mode`, `What` and `Why` present, each exactly once
  - `Mode` value is `hitl` or `auto` (the 1.x value `autonomous` is rejected with a rename hint)
  - No trailer is empty
  - The four trailers are consecutive lines in the fixed order `Agent`, `Mode`, `What`, `Why`: one line each, nothing between them
  - They sit in the last block of the message, after a blank line; only other trailers (e.g. `Co-Authored-By`, `Signed-off-by`) may come before `Agent` or after `Why`
- Comment lines and the scissors section that git adds when the message is written in an editor are ignored, as git ignores them when storing the message.
- The same rules are implemented by `qac_validate` in the MCP server; `mcp-server/src/hook-parity.test.ts` checks that both reach the same verdict with the same messages.

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

Every problem found is listed, followed by a reminder of the required footer:

```
QAC: agent commit rejected:
  - invalid Mode value: 'autonomous' was renamed to 'auto' in QAC 2.0

Required footer (last block of the message, one line each):
  Agent: <agent name>
  Mode: <hitl | auto>
  What: <semantic summary>
  Why: <condition + impact>
  <optional other trailers, e.g. Co-Authored-By>
```

Other messages:

```
  - missing trailer: Why
  - trailer Why appears 2 times; it must appear exactly once
  - invalid Mode value: 'review' (must be 'hitl' or 'auto')
  - trailer What is empty
  - trailers must appear in fixed order: Agent, Mode, What, Why
  - Agent, Mode, What and Why must be consecutive lines: one line each, with nothing between them
  - the trailers must be separated from the subject line (or body) by a blank line
  - the trailers must be the last block of the message: text found after them
  - Why must fit on a single line: continuation line found
  - only other trailers (e.g. Co-Authored-By) may follow Why, found: <line>
```

## Bypassing (emergency only)

```bash
git commit --no-verify
```

Use only when the hook itself is broken. Bypassing silently drops QAC validation — the resulting commit will lack trailers or have invalid ones.

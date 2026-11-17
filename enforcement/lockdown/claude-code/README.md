# QAC lockdown — Claude Code

Makes the [QAC MCP server](../../../mcp-server) the **only** way a Claude Code agent can create a commit in a repository. The agent gets no shell; it can read and edit the code, and it commits by calling `mcp__qac__qac_commit`, which always writes the four QAC trailers.

The [skill](../../../skill) asks the model to follow the spec. The [commit-msg hook](../../commit-msg-hook.sh) checks agent commits, but a commit with no trailers passes it as human, and `--no-verify` skips it. This profile closes both gaps by removing every path to `git commit` except the QAC tool.

## Install

```bash
# once, in your qac-spec checkout
(cd /path/to/qac-spec/mcp-server && npm run setup)

# from the root of the repository to lock down
sh /path/to/qac-spec/enforcement/lockdown/claude-code/install.sh
git add .claude .mcp.json && git commit -m "chore: add QAC lockdown"
```

The installer writes three files and refuses to overwrite existing ones (`--force` overrides):

| File | Role |
|------|------|
| `.claude/settings.json` | Permission rules: shell tools denied, writes to protected paths denied, only the QAC tools allowed |
| `.claude/hooks/qac-guard.mjs` | `PreToolUse` guard: a second, independent allowlist that runs before every tool call, fail-closed |
| `.mcp.json` | The `qac` MCP server, pointing at this qac-spec checkout's `tsx` binary (no `npx` download) |

## What is blocked, and by which layer

| Path to an unqualified commit | Permission rules | Guard hook |
|---|---|---|
| `git commit` / `--no-verify` / any command via Bash, PowerShell or Monitor | denied (the tools are removed from the session) | denied |
| Writing `.git/hooks`, `.git/config` (`core.hooksPath`, aliases), `.githooks/` | denied | denied, including through symlinks, `..` traversal and nested repositories |
| Rewriting the lockdown itself: `.claude/**`, `.mcp.json`, `~/.claude/**`, `~/.gitconfig` | denied (`blockWritesOutsideWorkingDirectories` also protects settings files) | denied |
| Other MCP servers that can commit (a GitHub or git MCP server) | not in the allowlist | denied: only `qac_commit`, `qac_validate` and `qac_format` pass |
| `qac_install_hook`, `resume_workflow` | denied (removed from the session) | denied |
| Switching to `bypassPermissions` or `auto` mode | disabled | still runs (hooks run in every mode) |

The guard never grants anything: allowed calls produce no output, so the permission rules still decide them. If the guard crashes or times out, `onFailure: "block"` denies the call.

## Verified

- **Guard:** 23 synthetic payloads, all as expected, including a symlink into `.git/hooks`, `src/../.git` traversal, a nested `vendor/x/.git/hooks`, an unparseable payload and a foreign MCP tool.
- **Live, autonomous run** (`claude -p`, unattended): the session was offered no shell tool and only the three QAC tools. The agent wrote the file and committed through `qac_commit`. The commit carries `Agent`/`Mode`/`What`/`Why`, and the hashes of `.claude/settings.json`, the guard and `.mcp.json` were unchanged afterwards.

## Untrusted workspaces and headless runs

In a workspace nobody has trusted (a fresh CI checkout, a first `claude -p`), Claude Code **ignores the `allow` rules** of the project's `.claude/settings.json` and keeps the `deny` rules. The lockdown therefore still holds, but the agent cannot even edit files. For autonomous runs, have the launcher pass the profile as trusted settings:

```bash
claude -p "<task>" --settings .claude/settings.json
```

or accept the trust dialog once, interactively, in that checkout.

## What this does not cover

- **Running code reopens the door.** Without a shell the agent cannot run tests or builds. Do not add `Bash(npm test)` or similar to regain them: a test file or a `package.json` script the agent edits can call `git commit` itself. If agents must run code, rely on a server-side check instead (below).
- **Content quality.** The lockdown guarantees the commit goes through `qac_commit`. The structural rules (all four trailers, valid `Mode`, fixed order) are enforced there. Whether `What` describes the effect and `Why` the problem is still the model's judgment.
- **`Mode` honesty.** The agent declares `hitl` or `autonomous` itself.
- **Commits made outside Claude Code** (humans, other agents, other machines). Require QAC trailers on agent branches in CI. That is the only check that also covers a machine without this profile.
- **Interactive sessions:** a person at the keyboard can still approve a prompt or edit the settings. The profile constrains the agent, not its operator.

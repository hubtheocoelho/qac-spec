# QAC MCP Server

An [MCP](https://modelcontextprotocol.io) server that makes **Qualified Agent Commits** a *capability* your agent can call, not just a convention it has to remember.

Where the [QAC skill](../skill) *teaches* an agent to write the four trailers, this server *produces and enforces* them: the agent calls a tool, and a git commit comes out with `Agent`, `Mode`, `What` and `Why` already in the footer — validated against the same rules as the [enforcement hook](../enforcement).

It is built on the [MCP Orchestrator SDK](https://github.com/hubtheocoelho/mcp_orchestrator_sdk) (vendored as a git submodule under `third_party/`). Each QAC operation is an SDK `ToolDefinition` registered on an `Orchestrator`, so every call runs through the SDK's schema validation, hook manager and audit sink before it is exposed over the MCP wire.

---

## Tools

| Tool | Safety | Purpose |
|------|--------|---------|
| **`qac_format`** | read-only | Render a QAC-compliant commit message from structured fields. Makes no git changes. |
| **`qac_validate`** | read-only | Validate a message (inline `message` or a git `ref`, default `HEAD`) against the QAC schema. |
| **`qac_commit`** | write | Stage (optional) and create a commit whose footer carries the four QAC trailers. |
| **`qac_install_hook`** | write | Install the QAC enforcement `commit-msg` hook into a repository (local or shared). |

### `qac_commit` — the primary tool

```jsonc
{
  "name": "qac_commit",
  "arguments": {
    "subject": "feat(auth): add token refresh endpoint",
    "agent": "claude-code",
    "mode": "hitl",                     // hitl | autonomous
    "what": "add POST /auth/refresh with JWT rotation and 7-day sliding window",
    "why": "sessions expired silently with no renewal path, forcing re-auth on every visit",
    "cwd": "/path/to/repo",             // optional, defaults to server cwd
    "add": "all"                        // "all" | ["path/a", "path/b"] | omit
  }
}
```

produces exactly:

```
feat(auth): add token refresh endpoint

Agent: claude-code
Mode: hitl
What: add POST /auth/refresh with JWT rotation and 7-day sliding window
Why: sessions expired silently with no renewal path, forcing re-auth on every visit
```

A commit produced by `qac_commit` always passes `qac_validate` and the enforcement hook.

---

## Install

Requires **Node ≥ 20** and **git ≥ 2.9** (git ≥ 2.22 for `valueonly` trailer queries).

```bash
# 1. Clone with the SDK submodule
git clone --recurse-submodules https://github.com/hubtheocoelho/qac-spec
# (already cloned? → git submodule update --init --recursive)

# 2. Install the server's dependencies
cd qac-spec/mcp-server
npm install
```

No build step: the server runs from TypeScript source via [`tsx`](https://github.com/privatenumber/tsx), importing the SDK packages straight from the submodule.

### Smoke test

```bash
npm test          # unit tests for the QAC schema logic
npm run typecheck # type-check against the SDK source
```

---

## Connect it to your agent

The server speaks MCP over **stdio**. Point any MCP client at it.

**Claude Code** — add to `.mcp.json` at your repo root (see [`examples/claude-code.mcp.json`](examples/claude-code.mcp.json)):

```json
{
  "mcpServers": {
    "qac": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/qac-spec/mcp-server/src/index.ts"]
    }
  }
}
```

**Cursor / Windsurf** — use the same `command`/`args` shape in their MCP settings.

Once connected, the agent can call `qac_commit` instead of hand-writing `git commit`, and the trailers are produced mechanically every time.

---

## How it consumes the SDK

```
MCP client (Claude Code, Cursor, …)
        │  JSON-RPC over stdio
        ▼
  src/server.ts        ← thin bridge: tools/list + tools/call
        │  orchestrator.callTool(id, args)
        ▼
  @mcp-orchestrator/core  Orchestrator
        │  schema validation · hooks · JSONL audit (→ stderr)
        ▼
  src/tools.ts         ← QAC ToolDefinitions
        │  git(...) via child_process · QAC schema logic
        ▼
      git CLI
```

The MCP layer never re-implements dispatch, validation or auditing — it translates protocol requests into `Orchestrator.callTool`, and the SDK does the rest. Swapping stdio for another transport, or driving the same tools from a workflow, changes nothing in `tools.ts`.

---

## License

MIT — same as the QAC specification.

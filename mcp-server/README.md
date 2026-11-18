# QAC MCP Server

An [MCP](https://modelcontextprotocol.io) server that creates **Qualified Agent Commits** through a tool call. It is one more creation mechanism next to `git commit --trailer=` and plain message text: the spec fixes the schema and leaves the mechanism to you.

The agent passes the four values to `qac_commit`, and a git commit comes out with `Agent`, `Mode`, `What` and `Why` in the footer, validated against the same rules as the [enforcement hook](../enforcement). The tool checks the structure only. What goes into `What` and `Why` still comes from the agent, guided by the [QAC skill](../skill).

It is built on the [MCP Orchestrator SDK](https://github.com/hubtheocoelho/mcp_orchestrator_sdk) (vendored as a git submodule under `third_party/`), using three of its layers: each QAC operation is an SDK `ToolDefinition` on an `Orchestrator`, wrapped as a one-step `WorkflowEngine` workflow, and exposed over MCP by the SDK's own `McpWorkflowServer`. Every call runs through the SDK's schema validation, hook manager and audit sink — this server adds no wire plumbing of its own.

---

## Tools

| Tool | Safety | Purpose |
|------|--------|---------|
| **`qac_format`** | read-only | Render a QAC-compliant commit message from structured fields. Makes no git changes. |
| **`qac_validate`** | read-only | Validate a message (inline `message` or a git `ref`, default `HEAD`) against the QAC schema. |
| **`qac_commit`** | write | Stage (optional) and create a commit whose footer carries the four QAC trailers. |
| **`qac_install_hook`** | write | Install the QAC enforcement `commit-msg` hook into a repository (local or shared). |

### `qac_commit`

```jsonc
{
  "name": "qac_commit",
  "arguments": {
    "subject": "feat(auth): add token refresh endpoint",
    "agent": "claude-code",
    "mode": "hitl",                     // hitl | auto
    "what": "add POST /auth/refresh with JWT rotation and 7-day sliding window",
    "why": "sessions expired silently with no renewal path, forcing re-auth on every visit",
    "trailers": ["Co-Authored-By: Jane Doe <jane@example.com>"],  // optional, placed after Why
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
Co-Authored-By: Jane Doe <jane@example.com>
```

A commit produced by `qac_commit` always passes `qac_validate` and the enforcement hook. Both apply the QAC 2.0 rules with the same messages: `src/hook-parity.test.ts` runs them over a shared set of messages.

---

## Install

Requires **Node ≥ 20** and **git ≥ 2.9** (git ≥ 2.22 for `valueonly` trailer queries).

```bash
# 1. Clone with the SDK submodule
git clone --recurse-submodules https://github.com/hubtheocoelho/qac-spec
# (already cloned? → git submodule update --init --recursive)

# 2. One-command setup: build the SDK submodule, install deps, link the SDK
cd qac-spec/mcp-server
npm run setup
```

`npm run setup` runs three steps (also available individually):

| Step | Script | What it does |
|------|--------|--------------|
| 1 | `npm run sdk:build` | `npm install` + `npm run build` inside the SDK submodule (produces each package's `dist/`) |
| 2 | `npm install` | installs this server's dev dependencies |
| 3 | `npm run sdk:link` | symlinks the built SDK packages into `node_modules/@mcp-orchestrator/*` |

The SDK is a private npm-workspaces monorepo whose packages reference each other by version, so they are consumed as built packages linked from the submodule. The server itself runs from TypeScript source via [`tsx`](https://github.com/privatenumber/tsx) — no build step for this package.

### Smoke test

```bash
npm test          # unit tests for the QAC schema logic
npm run typecheck # type-check against the SDK's built types
```

---

## Connect it to your agent

The server speaks MCP over **stdio**. Point any MCP client at it.

**Claude Code** — add to `.mcp.json` at your repo root (see [`examples/claude-code.mcp.json`](examples/claude-code.mcp.json)):

```json
{
  "mcpServers": {
    "qac": {
      "command": "/absolute/path/to/qac-spec/mcp-server/node_modules/.bin/tsx",
      "args": ["/absolute/path/to/qac-spec/mcp-server/src/index.ts"]
    }
  }
}
```

Point `command` at this package's own `tsx` binary rather than `npx tsx`: the client starts the server from your repository, where `npx` would look for `tsx` and may download it from the registry.

**Cursor / Windsurf** — use the same `command`/`args` shape in their MCP settings.

Once connected, the agent can call `qac_commit` as one way to create a QAC commit. The spec leaves the creation mechanism to the developer, so `git commit --trailer=` and plain message text remain equally valid. Install the [QAC skill](../skill) alongside the server: the tool guarantees the structure, while the skill guides the content of `What` and `Why`.

---

## How it consumes the SDK

```
MCP client (Claude Code, Cursor, …)
        │  JSON-RPC over stdio
        ▼
  @mcp-orchestrator/mcp-server  McpWorkflowServer + serveStdio   ← SDK's own MCP layer
        │  engine.execute(workflowId, args)
        ▼
  @mcp-orchestrator/workflow    WorkflowEngine                   ← src/workflows.ts: 1 workflow per QAC op
        │  tools.callTool(id, params)   (the Orchestrator is the ToolCaller)
        ▼
  @mcp-orchestrator/core        Orchestrator                     ← schema validation · hooks · JSONL audit (→ stderr)
        │  execute(params)
        ▼
  src/tools.ts                  QAC ToolDefinitions              ← git(...) via child_process · QAC schema logic
        ▼
      git CLI
```

Each QAC operation is one workflow whose single step calls the matching tool. The MCP wire layer (`tools/list`, `tools/call`, result shaping) is the SDK's `McpWorkflowServer`; this package re-implements no dispatch, validation, auditing or transport. The only glue is `src/workflows.ts` (workflow definitions) and `src/server.ts` (wiring the three layers).

> The SDK's server also exposes a built-in `resume_workflow` tool used to continue workflows that pause for input. None of the QAC workflows pause, so it is never needed here — it is simply part of the SDK's server contract.

---

## License

MIT — same as the QAC specification.

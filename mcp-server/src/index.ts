#!/usr/bin/env -S npx tsx
/**
 * QAC MCP server entrypoint.
 *
 * Wires the SDK-backed orchestrator + workflow engine to the SDK's MCP server
 * layer over stdio. Run directly (`tsx src/index.ts`) or via the
 * `qac-mcp-server` bin. All diagnostics go to stderr; stdout carries only the
 * MCP JSON-RPC stream.
 */

import { serveStdio } from "@mcp-orchestrator/mcp-server";
import { buildMcpServer } from "./server.ts";

const NAME = "qac-mcp-server";
const VERSION = "1.0.0";

async function main(): Promise<void> {
  const { server, workflowIds } = buildMcpServer({ name: NAME, version: VERSION });
  await serveStdio(server);
  process.stderr.write(`${NAME} v${VERSION} ready on stdio — tools: ${workflowIds.join(", ")}\n`);
}

main().catch((err) => {
  process.stderr.write(`${NAME} fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

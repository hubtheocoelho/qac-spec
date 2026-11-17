#!/usr/bin/env -S npx tsx
/**
 * QAC MCP server entrypoint.
 *
 * Wires the SDK-backed orchestrator to an MCP stdio transport. Run directly
 * (`tsx src/index.ts`) or via the `qac-mcp-server` bin. All diagnostics go to
 * stderr; stdout carries only the MCP JSON-RPC stream.
 */

import { buildOrchestrator } from "./orchestrator.ts";
import { createMcpServer, serveStdio } from "./server.ts";

const NAME = "qac-mcp-server";
const VERSION = "1.0.0";

async function main(): Promise<void> {
  const orchestrator = buildOrchestrator();
  const server = createMcpServer(orchestrator, { name: NAME, version: VERSION });

  const shutdown = async () => {
    try {
      await orchestrator.dispose();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await serveStdio(server);
  process.stderr.write(`${NAME} v${VERSION} ready on stdio — ${orchestrator.tools.list().length} QAC tools\n`);
}

main().catch((err) => {
  process.stderr.write(`${NAME} fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

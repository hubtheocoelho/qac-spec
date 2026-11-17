/**
 * MCP wire bridge: exposes the Orchestrator's QAC tools over the Model Context
 * Protocol so any MCP client (Claude Code, Cursor, Windsurf, …) can call them.
 *
 * The bridge is deliberately thin. Tool discovery reads the Orchestrator's tool
 * registry; tool invocation delegates to `orchestrator.callTool`, which runs the
 * SDK's validation, hooks and audit. The MCP layer never re-implements any of
 * that — it only translates JSON-RPC requests into orchestrator calls.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { Orchestrator } from "@mcp-orchestrator/core";

export interface ServerInfo {
  name: string;
  version: string;
}

/** Create an MCP `Server` whose tools are backed by the given orchestrator. */
export function createMcpServer(orchestrator: Orchestrator, info: ServerInfo): Server {
  const server = new Server(
    { name: info.name, version: info.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: orchestrator.tools.list().map((tool) => ({
      name: tool.id,
      description: tool.description,
      inputSchema: tool.schema as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;
    const result = await orchestrator.callTool(name, (args ?? {}) as Record<string, never>, {
      caller: "system",
    });

    // Transport-level failure (unknown tool, schema rejection, thrown error).
    if (!result.ok) {
      return {
        content: [{ type: "text", text: `Error: ${result.error ?? "tool call failed"}` }],
        isError: true,
      };
    }

    // Tool-level outcome: our tools signal validation problems with `ok: false`
    // in their output while still executing successfully.
    const output = result.output as { ok?: boolean } | undefined;
    const toolFailed = output !== null && typeof output === "object" && output?.ok === false;

    return {
      content: [{ type: "text", text: JSON.stringify(result.output, null, 2) }],
      isError: toolFailed,
    };
  });

  return server;
}

/** Connect the server to stdio and run until the transport closes. */
export async function serveStdio(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

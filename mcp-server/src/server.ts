/**
 * Assembles the QAC MCP server from the SDK's layers.
 *
 *   Orchestrator (core)      — holds the QAC tools; validation, hooks, audit.
 *       │  ToolCaller
 *   WorkflowEngine (workflow) — one workflow per QAC operation.
 *       │
 *   McpWorkflowServer (mcp-server) — exposes each workflow as an MCP tool.
 *
 * The MCP wire layer is the SDK's own `McpWorkflowServer`; this module only
 * wires the three layers together. Transport (stdio / HTTP) is chosen by the
 * caller via the SDK's `serveStdio` / `createStreamableHttpHandler`.
 */

import { McpWorkflowServer } from "@mcp-orchestrator/mcp-server";
import { buildOrchestrator, type BuildOptions } from "./orchestrator.ts";
import { buildWorkflowEngine, QAC_WORKFLOW_IDS } from "./workflows.ts";

export interface ServerInfo {
  name: string;
  version: string;
}

export interface BuildServerResult {
  server: McpWorkflowServer;
  /** The exposed tool/workflow ids, for logging. */
  workflowIds: string[];
}

/** Build the fully-wired QAC MCP server (orchestrator → engine → MCP server). */
export function buildMcpServer(info: ServerInfo, options: BuildOptions = {}): BuildServerResult {
  const orchestrator = buildOrchestrator(options);
  const engine = buildWorkflowEngine(orchestrator);
  const server = new McpWorkflowServer({
    name: info.name,
    version: info.version,
    engine,
    // No workflow needs mid-run input, so keep every call a single round-trip.
    mode: "suspend",
    instructions:
      "QAC (Qualified Agent Commits) tools. Use qac_commit to create commits whose footer carries the Agent, Mode, What and Why trailers; qac_validate to check a message; qac_format to preview one; qac_install_hook to install the enforcement hook.",
  });
  return { server, workflowIds: [...QAC_WORKFLOW_IDS] };
}

/**
 * Builds the MCP Orchestrator SDK `Orchestrator` that backs the QAC server.
 *
 * This is where the server "consumes" the SDK: instead of hand-rolling tool
 * dispatch, validation and auditing, the QAC tools are registered on an
 * `Orchestrator`. Every tool call then flows through the SDK's tool registry
 * (schema validation), hook manager and audit sink before and after execution.
 */

import { Orchestrator, JsonlAuditSink } from "@mcp-orchestrator/core";
import { qacTools } from "./tools.ts";

export interface BuildOptions {
  /** Emit a JSONL audit record per tool call to this sink (default: stderr). */
  audit?: (line: string) => void;
}

/**
 * Create and configure an Orchestrator with every QAC tool registered.
 *
 * Audit lines go to stderr by default: stdout is reserved for the MCP
 * JSON-RPC stream, so anything else written there would corrupt the protocol.
 */
export function buildOrchestrator(options: BuildOptions = {}): Orchestrator {
  const writeAudit = options.audit ?? ((line: string) => process.stderr.write(line + "\n"));
  const orchestrator = new Orchestrator({
    auditSinks: [new JsonlAuditSink(writeAudit)],
  });

  for (const tool of qacTools) {
    orchestrator.registerTool(tool, { source: "qac" });
  }

  // The workflow server drives tool calls as the caller "mcp-client"; register
  // it as an agent allowed to call every QAC tool (no `tools` list = all).
  void orchestrator.registerAgent({ id: "mcp-client", description: "MCP client driving QAC workflows" });

  return orchestrator;
}

/**
 * QAC workflows.
 *
 * The SDK's `@mcp-orchestrator/mcp-server` exposes *workflows* as MCP tools, so
 * each QAC operation is modelled as a one-step workflow whose single step calls
 * the matching tool registered on the Orchestrator. The Orchestrator is handed
 * to the engine as its `ToolCaller`, so every step still runs through the SDK's
 * schema validation, hooks and audit.
 *
 * Workflow inputs declare the tool surface the MCP client sees; `${input.x}`
 * templates forward them to the tool, and the `outputs` map surfaces the tool's
 * return value as the workflow result.
 */

import { WorkflowEngine, type WorkflowDefinitionInput } from "@mcp-orchestrator/workflow";
import type { ToolCaller } from "@mcp-orchestrator/workflow";
import { QAC_MODES } from "./qac.ts";

const MODE_HINT = `one of ${QAC_MODES.join(" | ")}`;

/** Input field declarations shared across the commit-producing workflows. */
const commitInputs = {
  subject: {
    type: "string" as const,
    required: true,
    description: "Subject line following the repository's own convention (e.g. Conventional Commits). Single line, ideally <= 72 chars.",
  },
  agent: { type: "string" as const, required: true, description: "Name of the agent executing the commit, e.g. 'claude-code'." },
  mode: { type: "string" as const, required: true, description: `Operation mode: ${MODE_HINT}. 'hitl' = user requested/approved, 'autonomous' = agent decided alone.` },
  what: { type: "string" as const, required: true, description: "Semantic summary of the effect of the change, understandable without reading the diff." },
  why: { type: "string" as const, required: true, description: "The condition that existed and the impact it caused — the problem, not the solution." },
  body: { type: "string" as const, required: false, description: "Optional free-form body paragraph(s), placed between the subject and the trailer block." },
};

/** Params object forwarding every commit field from workflow input to the tool. */
const commitParams = {
  subject: "${input.subject}",
  agent: "${input.agent}",
  mode: "${input.mode}",
  what: "${input.what}",
  why: "${input.why}",
  body: "${input.body}",
};

const SURFACE_OUTPUT = { result: "${steps.run.output}" } as const;

const workflows: WorkflowDefinitionInput[] = [
  {
    id: "qac_format",
    description:
      "Render a QAC-compliant commit message (subject + optional body + Agent/Mode/What/Why trailers) from structured fields. Read-only: produces text, makes no git changes.",
    inputs: { ...commitInputs },
    steps: [{ id: "run", tool: "qac_format", params: { ...commitParams } }],
    outputs: { ...SURFACE_OUTPUT },
  },
  {
    id: "qac_validate",
    description:
      "Validate a commit message against the QAC schema (same rules as the enforcement commit-msg hook). Pass `message` to check text directly, or `ref` (default HEAD) to check an existing commit in `cwd`.",
    inputs: {
      message: { type: "string", required: false, description: "Raw commit message text to validate. Takes precedence over `ref`." },
      ref: { type: "string", required: false, description: "Git ref whose message to validate (default 'HEAD'), used when `message` is omitted." },
      cwd: { type: "string", required: false, description: "Repository working directory (default: server process cwd)." },
    },
    steps: [{ id: "run", tool: "qac_validate", params: { message: "${input.message}", ref: "${input.ref}", cwd: "${input.cwd}" } }],
    outputs: { ...SURFACE_OUTPUT },
  },
  {
    id: "qac_commit",
    description:
      "Create a git commit whose footer carries the four mandatory QAC trailers (Agent, Mode, What, Why). Optionally stages files first. The resulting commit passes qac_validate and the QAC enforcement hook.",
    inputs: {
      ...commitInputs,
      cwd: { type: "string", required: false, description: "Repository working directory (default: server process cwd)." },
      add: {
        // No single JSON type: accepts the string "all" or an array of pathspecs.
        required: false,
        description: "Staging strategy: the string 'all' to stage every change, an array of pathspecs to stage specific files, or omit to commit what is already staged.",
      },
      allowEmpty: { type: "boolean", required: false, description: "Allow a commit with no staged changes (default false)." },
      signoff: { type: "boolean", required: false, description: "Add a Signed-off-by trailer via git -s (default false)." },
    },
    steps: [
      {
        id: "run",
        tool: "qac_commit",
        params: { ...commitParams, cwd: "${input.cwd}", add: "${input.add}", allowEmpty: "${input.allowEmpty}", signoff: "${input.signoff}" },
      },
    ],
    outputs: { ...SURFACE_OUTPUT },
  },
  {
    id: "qac_install_hook",
    description:
      "Install the QAC enforcement commit-msg hook into a repository, so agent commits missing or malforming the trailers are rejected at commit time. Use `shared: true` for a team-wide .githooks install; otherwise it goes into local .git/hooks.",
    inputs: {
      cwd: { type: "string", required: false, description: "Repository working directory (default: server process cwd)." },
      shared: { type: "boolean", required: false, description: "Install to .githooks and set core.hooksPath (shared) instead of local .git/hooks." },
    },
    steps: [{ id: "run", tool: "qac_install_hook", params: { cwd: "${input.cwd}", shared: "${input.shared}" } }],
    outputs: { ...SURFACE_OUTPUT },
  },
];

/** Ids of the workflows exposed by the server, in a stable order. */
export const QAC_WORKFLOW_IDS = workflows.map((w) => w.id as string);

/** Build a WorkflowEngine backed by the given tool caller, with all QAC workflows defined. */
export function buildWorkflowEngine(tools: ToolCaller): WorkflowEngine {
  const engine = new WorkflowEngine({ tools });
  for (const definition of workflows) {
    engine.define(definition);
  }
  return engine;
}

/**
 * QAC tools, expressed as MCP Orchestrator SDK `ToolDefinition`s.
 *
 * Each tool is a plain, transport-agnostic definition: an id, a JSON schema, a
 * safety classification and an `execute` function. They are registered on an
 * `Orchestrator` (see orchestrator.ts), which gives them validation, audit and
 * hooks for free, and then surfaced over the MCP wire (see server.ts). The same
 * definitions could just as well be driven by a workflow or another agent.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtemp, writeFile, rm, readFile, mkdir, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolDefinition, JsonObject, JsonValue, JsonSchema } from "@mcp-orchestrator/core";
import { git, repoRoot } from "./git.ts";
import {
  formatCommitMessage,
  validateCommitInput,
  validateCommitMessage,
  QAC_MODES,
  type QacCommitInput,
  type QacMode,
} from "./qac.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Path to the canonical enforcement hook shipped alongside this server. */
const HOOK_SOURCE = resolve(__dirname, "..", "..", "enforcement", "commit-msg-hook.sh");

function str(params: JsonObject, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

/** Narrow an arbitrary result object to the SDK's structural JsonValue type. */
function json(value: unknown): JsonValue {
  return value as unknown as JsonValue;
}

/** Shared JSON-schema fragment for the four trailer fields plus subject/body. */
const commitFields: Record<string, JsonSchema> = {
  subject: {
    type: "string",
    description:
      "Subject line, following the repository's own convention (e.g. Conventional Commits). Single line, ideally <= 72 chars.",
  },
  agent: {
    type: "string",
    description: "Name of the agent executing the commit, e.g. 'claude-code'.",
  },
  mode: {
    type: "string",
    enum: [...QAC_MODES],
    description: "'hitl' when a human requested or approved this change, 'auto' when the agent decided and executed it without human intervention. A scheduled or triggered run is 'hitl' only if a human requested this specific change.",
  },
  what: {
    type: "string",
    description: "Semantic summary of the effect of the change, understandable without reading the diff.",
  },
  why: {
    type: "string",
    description: "The condition that existed and the impact it caused — the problem, not the solution.",
  },
  trailers: {
    type: "array",
    items: { type: "string" },
    description: "Optional trailers outside QAC, e.g. 'Co-Authored-By: Name <email>', placed in the footer after Why. One 'Key: value' per entry.",
  },
  body: {
    type: "string",
    description: "Optional free-form body paragraph(s), placed between the subject and the trailer block.",
  },
};

/** qac_format — build a QAC-compliant commit message without touching git. */
const formatTool: ToolDefinition = {
  id: "qac_format",
  description:
    "Render a QAC-compliant commit message (subject + optional body + Agent/Mode/What/Why trailers) from structured fields. Read-only: produces text, makes no git changes. Use it to preview or to feed another commit mechanism.",
  safety: "read-only",
  schema: {
    type: "object",
    properties: {
      subject: commitFields.subject,
      agent: commitFields.agent,
      mode: commitFields.mode,
      what: commitFields.what,
      why: commitFields.why,
      body: commitFields.body,
      trailers: commitFields.trailers,
    },
    required: ["subject", "agent", "mode", "what", "why"],
  },
  execute(params) {
    const errors = validateCommitInput(params as Partial<QacCommitInput>);
    if (errors.length > 0) {
      return json({ ok: false, errors });
    }
    const message = formatCommitMessage({
      subject: str(params, "subject")!,
      agent: str(params, "agent")!,
      mode: str(params, "mode") as QacMode,
      what: str(params, "what")!,
      why: str(params, "why")!,
      body: str(params, "body"),
      trailers: Array.isArray(params["trailers"]) ? params["trailers"].map(String) : undefined,
    });
    return json({ ok: true, message });
  },
};

/** qac_validate — check a message (inline or from a ref) against the QAC schema. */
const validateTool: ToolDefinition = {
  id: "qac_validate",
  description:
    "Validate a commit message against the QAC schema (same rules as the enforcement commit-msg hook). Pass `message` to validate text directly, or `ref` (default HEAD) to validate an existing commit in `cwd`. A message with no Agent trailer is treated as a human commit and passes.",
  safety: "read-only",
  schema: {
    type: "object",
    properties: {
      message: { type: "string", description: "Raw commit message text to validate. Takes precedence over `ref`." },
      ref: { type: "string", description: "Git ref whose message to validate (default 'HEAD'). Used when `message` is omitted." },
      cwd: { type: "string", description: "Repository working directory (default: server process cwd)." },
    },
  },
  async execute(params) {
    let message = str(params, "message");
    let source = "message";
    if (message === undefined) {
      const ref = str(params, "ref") ?? "HEAD";
      const cwd = str(params, "cwd");
      const { stdout } = await git(["log", "-1", "--format=%B", ref], { cwd });
      message = stdout;
      source = ref;
    }
    const result = validateCommitMessage(message);
    return json({ ...result, source });
  },
};

/** qac_commit — create a QAC-qualified commit in a repository. */
const commitTool: ToolDefinition = {
  id: "qac_commit",
  description:
    "Create a git commit whose footer carries the four mandatory QAC trailers (Agent, Mode, What, Why). Optionally stages files first. The resulting commit passes qac_validate and the QAC enforcement hook.",
  safety: "write",
  schema: {
    type: "object",
    properties: {
      subject: commitFields.subject,
      agent: commitFields.agent,
      mode: commitFields.mode,
      what: commitFields.what,
      why: commitFields.why,
      body: commitFields.body,
      trailers: commitFields.trailers,
      cwd: { type: "string", description: "Repository working directory (default: server process cwd)." },
      add: {
        description:
          "Staging strategy before committing: 'all' to stage every tracked+untracked change, an array of pathspecs to stage specific files, or omit to commit what is already staged.",
        anyOf: [{ type: "string", enum: ["all"] }, { type: "array", items: { type: "string" } }],
      },
      allowEmpty: { type: "boolean", description: "Allow creating a commit with no staged changes (default false)." },
      signoff: { type: "boolean", description: "Add a Signed-off-by trailer via git -s (default false)." },
    },
    required: ["subject", "agent", "mode", "what", "why"],
  },
  async execute(params) {
    const inputErrors = validateCommitInput(params as Partial<QacCommitInput>);
    if (inputErrors.length > 0) {
      return json({ ok: false, errors: inputErrors });
    }
    const cwd = str(params, "cwd");
    // Fail fast with a clear message if we are not inside a repository.
    const root = await repoRoot(cwd);

    // Stage changes if requested.
    const add = params["add"];
    if (add === "all") {
      await git(["add", "-A"], { cwd });
    } else if (Array.isArray(add) && add.length > 0) {
      await git(["add", "--", ...add.map(String)], { cwd });
    }

    const message = formatCommitMessage({
      subject: str(params, "subject")!,
      agent: str(params, "agent")!,
      mode: str(params, "mode") as QacMode,
      what: str(params, "what")!,
      why: str(params, "why")!,
      body: str(params, "body"),
      trailers: Array.isArray(params["trailers"]) ? params["trailers"].map(String) : undefined,
    });

    // Write the message to a temp file and commit with -F so the stored object
    // is byte-for-byte what qac_format produced (spec's "message text" path).
    const dir = await mkdtemp(join(tmpdir(), "qac-"));
    const msgFile = join(dir, "COMMIT_EDITMSG");
    try {
      await writeFile(msgFile, message, "utf8");
      const args = ["commit", "-F", msgFile];
      if (params["allowEmpty"] === true) args.push("--allow-empty");
      if (params["signoff"] === true) args.push("-s");
      await git(args, { cwd });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }

    const { stdout: hash } = await git(["rev-parse", "HEAD"], { cwd });
    const { stdout: stored } = await git(["log", "-1", "--format=%B", "HEAD"], { cwd });
    return json({ ok: true, repository: root, commit: hash.trim(), message: stored.replace(/\n+$/, "\n") });
  },
};

/** qac_install_hook — install the enforcement commit-msg hook into a repository. */
const installHookTool: ToolDefinition = {
  id: "qac_install_hook",
  description:
    "Install the QAC enforcement commit-msg hook into a repository, so that any agent commit missing or malforming the trailers is rejected at commit time. Use `shared: true` to place it under .githooks and point core.hooksPath there (committable, team-wide); otherwise it is installed into the local .git/hooks (per-clone, untracked).",
  safety: "write",
  schema: {
    type: "object",
    properties: {
      cwd: { type: "string", description: "Repository working directory (default: server process cwd)." },
      shared: {
        type: "boolean",
        description: "Install to .githooks and set core.hooksPath (shared with the team) instead of local .git/hooks.",
      },
    },
  },
  async execute(params) {
    const cwd = str(params, "cwd");
    const root = await repoRoot(cwd);
    const hook = await readFile(HOOK_SOURCE, "utf8");
    const shared = params["shared"] === true;

    if (shared) {
      const dir = join(root, ".githooks");
      await mkdir(dir, { recursive: true });
      const dest = join(dir, "commit-msg");
      await writeFile(dest, hook, "utf8");
      await chmod(dest, 0o755);
      await git(["config", "core.hooksPath", ".githooks"], { cwd });
      return json({ ok: true, mode: "shared", path: ".githooks/commit-msg", note: "core.hooksPath set to .githooks (local git config); commit the file to share it." });
    }

    // `--absolute-git-dir` matters: the plain `--git-dir` answer is relative to
    // `cwd`, and resolving it from the server's own directory put the hook in
    // the wrong place.
    const { stdout } = await git(["rev-parse", "--absolute-git-dir"], { cwd });
    const hooksDir = join(stdout.trim(), "hooks");
    await mkdir(hooksDir, { recursive: true });
    const dest = join(hooksDir, "commit-msg");
    await writeFile(dest, hook, "utf8");
    await chmod(dest, 0o755);
    return json({ ok: true, mode: "local", path: dest, note: "Installed into .git/hooks (not tracked by git). Use shared:true to distribute to the team." });
  },
};

/** All QAC tools, in a stable order. */
export const qacTools: ToolDefinition[] = [formatTool, validateTool, commitTool, installHookTool];

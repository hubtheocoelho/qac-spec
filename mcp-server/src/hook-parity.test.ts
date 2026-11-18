/**
 * Parity between the two QAC validators: enforcement/commit-msg-hook.sh (run
 * by git) and validateCommitMessage (used by qac_validate). Every message below
 * goes through both; they must reach the same verdict with the same errors.
 * Run with: npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCommitMessage } from "./qac.ts";

const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "enforcement", "commit-msg-hook.sh");

const footer = "Agent: claude-code\nMode: hitl\nWhat: add retry to the fetch helper\nWhy: transient network errors failed the whole sync\n";

const corpus: Record<string, string> = {
  "human commit": "fix: typo in readme\n",
  "valid hitl": `feat: x\n\n${footer}`,
  "valid auto": "feat: x\n\nAgent: a\nMode: auto\nWhat: w\nWhy: z\n",
  "valid with body": `feat: x\n\nSome context.\nMore context.\n\n${footer}`,
  "valid with other trailers after Why": `feat: x\n\n${footer}Co-Authored-By: J <j@e.st>\nSigned-off-by: J <j@e.st>\n`,
  "valid with editor comments": `feat: x\n\n${footer}\n# Please enter the commit message\n#\n# On branch main\n`,
  "valid with scissors": `feat: x\n\n${footer}\n# ------------------------ >8 ------------------------\ndiff --git a/x b/x\n+Why: not a trailer\n`,
  "missing Mode and Why": "feat: x\n\nAgent: a\nWhat: w\n",
  "duplicated Why": "feat: x\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\nWhy: again\n",
  "legacy autonomous": "feat: x\n\nAgent: a\nMode: autonomous\nWhat: w\nWhy: z\n",
  "invalid mode": "feat: x\n\nAgent: a\nMode: semi\nWhat: w\nWhy: z\n",
  "empty mode": "feat: x\n\nAgent: a\nMode:\nWhat: w\nWhy: z\n",
  "empty What": "feat: x\n\nAgent: a\nMode: hitl\nWhat:\nWhy: z\n",
  "empty Agent and Why": "feat: x\n\nAgent:\nMode: hitl\nWhat: w\nWhy:   \n",
  "out of order": "feat: x\n\nMode: hitl\nAgent: a\nWhat: w\nWhy: z\n",
  "other trailer between QAC trailers": "feat: x\n\nAgent: a\nMode: hitl\nCo-Authored-By: J <j@e.st>\nWhat: w\nWhy: z\n",
  "multi-line What": "feat: x\n\nAgent: a\nMode: hitl\nWhat: w\n  continues\nWhy: z\n",
  "multi-line Why": "feat: x\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n  continues\n",
  "glued to subject": "feat: x\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n",
  "no subject": "Agent: a\nMode: hitl\nWhat: w\nWhy: z\n",
  "text after trailers": "feat: x\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n\nMore text.\n",
  "free text right after Why": "feat: x\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\nthanks!\n",
  "Signed-off-by before Agent (git -s with --trailer)": "feat: x\n\nSigned-off-by: J <j@e.st>\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n",
  "prose line glued above Agent": "feat: x\n\nSome context.\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n",
  "attribution in body": "feat: x\n\nCo-Authored-By: J <j@e.st>\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n",
};

function runHook(message: string, repo: string): { valid: boolean; errors: string[] } {
  const file = join(repo, "COMMIT_EDITMSG");
  writeFileSync(file, message, "utf8");
  const r = spawnSync("sh", [HOOK, file], { cwd: repo, encoding: "utf8" });
  const errors = r.stdout
    .split("\n")
    .filter((l) => l.startsWith("  - "))
    .map((l) => l.slice(4));
  return { valid: r.status === 0, errors };
}

test("commit-msg hook and validateCommitMessage agree on every message", () => {
  const repo = mkdtempSync(join(tmpdir(), "qac-parity-"));
  spawnSync("git", ["init", "-q"], { cwd: repo });
  try {
    for (const [name, message] of Object.entries(corpus)) {
      const hook = runHook(message, repo);
      const ts = validateCommitMessage(message);
      assert.equal(hook.valid, ts.valid, `${name}: hook valid=${hook.valid}, validator valid=${ts.valid}`);
      assert.deepEqual(hook.errors, ts.errors.map((e) => e.message), `${name}: error messages differ`);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("the parity corpus covers both verdicts", () => {
  const verdicts = new Set(Object.values(corpus).map((m) => validateCommitMessage(m).valid));
  assert.deepEqual([...verdicts].sort(), [false, true]);
});

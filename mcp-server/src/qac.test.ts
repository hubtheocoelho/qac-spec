/**
 * Unit tests for the QAC schema logic (format + validate).
 * Run with: npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatCommitMessage,
  validateCommitMessage,
  validateCommitInput,
} from "./qac.ts";

test("formatCommitMessage produces subject, blank line, then ordered trailers", () => {
  const msg = formatCommitMessage({
    subject: "feat(auth): add token refresh endpoint",
    agent: "claude-code",
    mode: "hitl",
    what: "add POST /auth/refresh with JWT rotation",
    why: "sessions expired silently with no renewal path",
  });
  assert.equal(
    msg,
    "feat(auth): add token refresh endpoint\n\n" +
      "Agent: claude-code\n" +
      "Mode: hitl\n" +
      "What: add POST /auth/refresh with JWT rotation\n" +
      "Why: sessions expired silently with no renewal path\n",
  );
});

test("formatCommitMessage places an optional body between subject and trailers", () => {
  const msg = formatCommitMessage({
    subject: "fix(db): widen pool",
    body: "Line one.\nLine two.",
    agent: "cursor-ai",
    mode: "autonomous",
    what: "raise max connections from 10 to 50",
    why: "pool exhaustion under load caused request timeouts",
  });
  const lines = msg.split("\n");
  assert.equal(lines[0], "fix(db): widen pool");
  assert.equal(lines[1], "");
  assert.equal(lines[2], "Line one.");
  assert.equal(lines[3], "Line two.");
  assert.equal(lines[4], "");
  assert.equal(lines[5], "Agent: cursor-ai");
});

test("formatCommitMessage collapses interior whitespace in What/Why", () => {
  const msg = formatCommitMessage({
    subject: "chore: x",
    agent: "a",
    mode: "hitl",
    what: "multi\n  line   what",
    why: "multi\nline why",
  });
  assert.match(msg, /^What: multi line what$/m);
  assert.match(msg, /^Why: multi line why$/m);
});

test("validateCommitMessage passes a human commit with no trailers", () => {
  const r = validateCommitMessage("just a plain commit\n");
  assert.equal(r.isAgentCommit, false);
  assert.equal(r.valid, true);
});

test("validateCommitMessage passes a fully-qualified agent commit", () => {
  const msg = formatCommitMessage({
    subject: "feat: y",
    agent: "claude-code",
    mode: "autonomous",
    what: "do the thing",
    why: "the thing was undone and broke the build",
  });
  const r = validateCommitMessage(msg);
  assert.equal(r.isAgentCommit, true);
  assert.equal(r.valid, true);
  assert.equal(r.errors.length, 0);
});

test("validateCommitMessage flags missing trailers on an agent commit", () => {
  const r = validateCommitMessage("feat: y\n\nAgent: claude-code\nWhat: did\n");
  assert.equal(r.valid, false);
  const paths = r.errors.map((e) => e.path).sort();
  assert.deepEqual(paths, ["Mode", "Why"]);
});

test("validateCommitMessage rejects an invalid Mode value", () => {
  const msg = "feat: y\n\nAgent: a\nMode: semi\nWhat: w\nWhy: z\n";
  const r = validateCommitMessage(msg);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.path === "Mode"));
});

test("validateCommitMessage rejects out-of-order trailers", () => {
  const msg = "feat: y\n\nMode: hitl\nAgent: a\nWhat: w\nWhy: z\n";
  const r = validateCommitMessage(msg);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.path === "order"));
});

test("validateCommitInput requires all structured fields", () => {
  const errors = validateCommitInput({ subject: "", agent: "", mode: undefined, what: "", why: "" });
  const paths = errors.map((e) => e.path).sort();
  assert.deepEqual(paths, ["agent", "mode", "subject", "what", "why"]);
});

test("round-trip: a message built by formatCommitMessage always validates", () => {
  const msg = formatCommitMessage({
    subject: "refactor(core): extract dispatcher",
    agent: "windsurf",
    mode: "hitl",
    what: "move tool dispatch out of the orchestrator constructor",
    why: "construction-time dispatch coupled wiring to execution and blocked testing",
  });
  assert.equal(validateCommitMessage(msg).valid, true);
});

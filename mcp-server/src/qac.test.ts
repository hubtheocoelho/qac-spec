/**
 * Unit tests for the QAC 2.0 schema logic (format + validate).
 * Run with: npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCommitMessage, validateCommitMessage, validateCommitInput } from "./qac.ts";

const base = {
  subject: "feat(auth): add token refresh endpoint",
  agent: "claude-code",
  mode: "hitl" as const,
  what: "add POST /auth/refresh with JWT rotation",
  why: "sessions expired silently with no renewal path",
};

const errorsOf = (msg: string) => validateCommitMessage(msg).errors.map((e) => e.message);

test("formatCommitMessage produces subject, blank line, then the four trailers in order", () => {
  assert.equal(
    formatCommitMessage(base),
    "feat(auth): add token refresh endpoint\n\n" +
      "Agent: claude-code\n" +
      "Mode: hitl\n" +
      "What: add POST /auth/refresh with JWT rotation\n" +
      "Why: sessions expired silently with no renewal path\n",
  );
});

test("formatCommitMessage places the body between subject and footer, other trailers after Why", () => {
  const msg = formatCommitMessage({
    ...base,
    mode: "auto",
    body: "Line one.\nLine two.",
    trailers: ["Co-Authored-By: Jane <jane@example.com>"],
  });
  assert.deepEqual(msg.split("\n"), [
    "feat(auth): add token refresh endpoint",
    "",
    "Line one.",
    "Line two.",
    "",
    "Agent: claude-code",
    "Mode: auto",
    "What: add POST /auth/refresh with JWT rotation",
    "Why: sessions expired silently with no renewal path",
    "Co-Authored-By: Jane <jane@example.com>",
    "",
  ]);
  assert.equal(validateCommitMessage(msg).valid, true);
});

test("formatCommitMessage keeps every trailer on one line", () => {
  const msg = formatCommitMessage({ ...base, what: "multi\n  line   what", why: "multi\nline why" });
  assert.match(msg, /^What: multi line what$/m);
  assert.match(msg, /^Why: multi line why$/m);
});

test("a message without an Agent trailer is a human commit and passes", () => {
  const r = validateCommitMessage("just a plain commit\n");
  assert.equal(r.isAgentCommit, false);
  assert.equal(r.valid, true);
});

test("missing trailers are reported", () => {
  assert.deepEqual(errorsOf("feat: y\n\nAgent: claude-code\nWhat: did\n"), ["missing trailer: Mode", "missing trailer: Why"]);
});

test("a duplicated QAC trailer is rejected", () => {
  const msg = "feat: y\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\nWhy: again\n";
  assert.deepEqual(errorsOf(msg), ["trailer Why appears 2 times; it must appear exactly once"]);
});

test("Mode accepts hitl and auto only", () => {
  assert.equal(validateCommitMessage("feat: y\n\nAgent: a\nMode: auto\nWhat: w\nWhy: z\n").valid, true);
  assert.deepEqual(errorsOf("feat: y\n\nAgent: a\nMode: semi\nWhat: w\nWhy: z\n"), [
    "invalid Mode value: 'semi' (must be 'hitl' or 'auto')",
  ]);
});

test("the 1.x value 'autonomous' is rejected with a rename hint", () => {
  assert.deepEqual(errorsOf("feat: y\n\nAgent: a\nMode: autonomous\nWhat: w\nWhy: z\n"), [
    "invalid Mode value: 'autonomous' was renamed to 'auto' in QAC 2.0",
  ]);
});

test("empty trailer values are rejected", () => {
  assert.deepEqual(errorsOf("feat: y\n\nAgent: a\nMode: hitl\nWhat:\nWhy: z\n"), ["trailer What is empty"]);
});

test("out-of-order trailers are rejected", () => {
  assert.deepEqual(errorsOf("feat: y\n\nMode: hitl\nAgent: a\nWhat: w\nWhy: z\n"), [
    "trailers must appear in fixed order: Agent, Mode, What, Why",
  ]);
});

test("another trailer between the QAC trailers is rejected", () => {
  const msg = "feat: y\n\nAgent: a\nMode: hitl\nCo-Authored-By: J <j@e.st>\nWhat: w\nWhy: z\n";
  assert.deepEqual(errorsOf(msg), [
    "Agent, Mode, What and Why must be consecutive lines: one line each, with nothing between them",
  ]);
});

test("a multi-line What is rejected", () => {
  const msg = "feat: y\n\nAgent: a\nMode: hitl\nWhat: w\n  continues\nWhy: z\n";
  assert.deepEqual(errorsOf(msg), [
    "Agent, Mode, What and Why must be consecutive lines: one line each, with nothing between them",
  ]);
});

test("a multi-line Why is rejected", () => {
  assert.deepEqual(errorsOf("feat: y\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n  continues\n"), [
    "Why must fit on a single line: continuation line found",
  ]);
});

test("trailers glued to the subject line are rejected", () => {
  assert.deepEqual(errorsOf("feat: y\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n"), [
    "the trailers must be separated from the subject line (or body) by a blank line",
  ]);
});

test("other trailers may open the footer before Agent; prose may not", () => {
  assert.equal(validateCommitMessage("feat: y\n\nSigned-off-by: J <j@e.st>\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n").valid, true);
  assert.deepEqual(errorsOf("feat: y\n\nSome context.\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n"), [
    "the trailers must be separated from the subject line (or body) by a blank line",
  ]);
});

test("body text after the trailers is rejected", () => {
  assert.deepEqual(errorsOf("feat: y\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n\nMore text.\n"), [
    "the trailers must be the last block of the message: text found after them",
  ]);
});

test("attribution placed in the body, above the QAC trailers, is not a trailer and passes as body text", () => {
  // The rule "never in the body" is guidance for agents: git cannot tell a
  // trailer-shaped body line from prose, so validation only checks the footer.
  const msg = "feat: y\n\nCo-Authored-By: J <j@e.st>\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n";
  assert.equal(validateCommitMessage(msg).valid, true);
});

test("other trailers after Why pass; free text after Why does not", () => {
  assert.equal(validateCommitMessage("feat: y\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\nSigned-off-by: J <j@e.st>\n").valid, true);
  assert.deepEqual(errorsOf("feat: y\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\nthanks!\n"), [
    "only other trailers (e.g. Co-Authored-By) may follow Why, found: thanks!",
  ]);
});

test("comment lines and the scissors section from an editor are ignored", () => {
  const msg =
    "feat: y\n\nAgent: a\nMode: hitl\nWhat: w\nWhy: z\n\n# Please enter the commit message\n#\n" +
    "# ------------------------ >8 ------------------------\ndiff --git a/x b/x\n";
  assert.equal(validateCommitMessage(msg).valid, true);
});

test("validateCommitInput requires all structured fields", () => {
  const errors = validateCommitInput({ subject: "", agent: "", mode: undefined, what: "", why: "" });
  assert.deepEqual(errors.map((e) => e.path).sort(), ["agent", "mode", "subject", "what", "why"]);
});

test("validateCommitInput hints the rename when given 'autonomous'", () => {
  const errors = validateCommitInput({ ...base, mode: "autonomous" as never });
  assert.deepEqual(errors.map((e) => e.message), ["'autonomous' was renamed to 'auto' in QAC 2.0; use 'auto'"]);
});

test("validateCommitInput rejects malformed or QAC-keyed extra trailers", () => {
  const errors = validateCommitInput({ ...base, trailers: ["not a trailer", "Why: sneaky", "Co-Authored-By: J <j@e.st>"] });
  assert.deepEqual(errors.map((e) => e.path), ["trailers.0", "trailers.1"]);
});

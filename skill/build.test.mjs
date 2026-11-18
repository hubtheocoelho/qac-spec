/**
 * Fails when SKILL.md or a provider file drifts from skill/build.mjs, or when
 * the rule text diverges between them.
 *
 *   node --test skill/build.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { outOfSync, render } from "./build.mjs";

test("every skill file matches skill/build.mjs (run `node skill/build.mjs` to regenerate)", () => {
  assert.deepEqual(outOfSync(), []);
});

test("every skill file carries the same rule sections", () => {
  // Compare the text from "## Mode" to the checklist's end: it holds no
  // agent-specific wording, so it must be byte-identical across all files.
  const ruleText = (content) => content.slice(content.indexOf("## Mode"), content.indexOf("## Examples"));
  const files = Object.entries(render());
  const [, reference] = files[0];
  for (const [path, content] of files) {
    assert.equal(ruleText(content), ruleText(reference), `${path} rule text differs from SKILL.md`);
  }
});

test("no skill file uses the QAC 1.x Mode value as a valid value", () => {
  for (const [path, content] of Object.entries(render())) {
    assert.doesNotMatch(content, /Mode: <hitl \| autonomous>|Mode: autonomous/, path);
  }
});

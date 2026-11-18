/**
 * QAC (Qualified Agent Commits) schema logic — formatting and validation, QAC 2.0.
 *
 * This module is the single source of truth for the schema inside the server.
 * It mirrors SPECIFICATION.md and enforcement/commit-msg-hook.sh rule for rule
 * (hook-parity.test.ts runs both over the same messages), so a commit produced
 * by `qac_commit` always passes `qac_validate` and the repository's hook.
 */

/** The four QAC trailer keys, in their fixed, mandatory order. */
export const QAC_TRAILER_ORDER = ["Agent", "Mode", "What", "Why"] as const;

/** Allowed values for the `Mode` trailer. */
export const QAC_MODES = ["hitl", "auto"] as const;
export type QacMode = (typeof QAC_MODES)[number];

/** The `Mode` value used by QAC 1.x, renamed to `auto` in 2.0. */
const LEGACY_AUTONOMOUS = "autonomous";

export interface QacTrailers {
  agent: string;
  mode: QacMode;
  what: string;
  why: string;
}

export interface QacCommitInput extends QacTrailers {
  /** Subject line, following the repository's own convention (e.g. Conventional Commits). */
  subject: string;
  /** Optional free-form body paragraph(s), placed between subject and trailers. */
  body?: string;
  /** Optional trailers outside QAC (e.g. `Co-Authored-By: Name <mail>`), placed after Why. */
  trailers?: string[];
}

export interface QacValidationError {
  path: string;
  message: string;
}

export interface QacValidationResult {
  valid: boolean;
  /** True when the message carries an `Agent:` trailer (i.e. it is an agent commit). */
  isAgentCommit: boolean;
  errors: QacValidationError[];
}

/** A trailer line outside QAC: `Key: value`, with a git-style token as key. */
const OTHER_TRAILER = /^[A-Za-z0-9-]+:\s*\S/;

/**
 * Build a full commit message: subject, optional body, the four QAC trailers as
 * the opening lines of the footer, then any other trailers. Each trailer value
 * is collapsed onto a single line.
 */
export function formatCommitMessage(input: QacCommitInput): string {
  const parts: string[] = [input.subject.trim()];

  const body = input.body?.trim();
  if (body) parts.push(body);

  const footer = [
    `Agent: ${collapse(input.agent)}`,
    `Mode: ${input.mode}`,
    `What: ${collapse(input.what)}`,
    `Why: ${collapse(input.why)}`,
    ...(input.trailers ?? []).map(collapse),
  ];

  parts.push(footer.join("\n"));
  return parts.join("\n\n") + "\n";
}

/** Collapse interior newlines/whitespace so a value stays on a single line. */
function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * The message as git stores it: comment lines and everything below the
 * scissors line removed, as git does for messages written in an editor.
 */
function storedLines(message: string, commentChar = "#"): string[] {
  const lines: string[] = [];
  for (const line of message.split(/\r?\n/)) {
    if (line.startsWith(`${commentChar} ------------------------ >8 ------------------------`)) break;
    if (line.startsWith(commentChar)) continue;
    lines.push(line);
  }
  while (lines.length > 0 && /^[ \t]*$/.test(lines[lines.length - 1])) lines.pop();
  return lines;
}

const isBlank = (line: string) => /^[ \t]*$/.test(line);

/**
 * Validate a raw commit message against the QAC schema.
 *
 * A message without an `Agent:` trailer is a human commit and passes untouched.
 * Otherwise every rule of the enforcement hook applies; error paths and
 * messages match the hook's.
 */
export function validateCommitMessage(message: string): QacValidationResult {
  const lines = storedLines(message);
  const pos: Record<string, number> = {};
  const value: Record<string, string> = {};
  const count: Record<string, number> = { Agent: 0, Mode: 0, What: 0, Why: 0 };

  lines.forEach((line, i) => {
    for (const key of QAC_TRAILER_ORDER) {
      if (line.startsWith(`${key}:`)) {
        count[key]++;
        pos[key] = i + 1;
        value[key] = line.slice(key.length + 1).trim();
      }
    }
  });

  if (count.Agent === 0) {
    return { valid: true, isAgentCommit: false, errors: [] };
  }

  const errors: QacValidationError[] = [];
  const fail = (path: string, msg: string) => errors.push({ path, message: msg });

  for (const key of QAC_TRAILER_ORDER) {
    if (count[key] === 0) fail(key, `missing trailer: ${key}`);
    else if (count[key] > 1) fail(key, `trailer ${key} appears ${count[key]} times; it must appear exactly once`);
  }
  if (errors.length > 0) return { valid: false, isAgentCommit: true, errors };

  if (value.Mode === LEGACY_AUTONOMOUS) {
    fail("Mode", "invalid Mode value: 'autonomous' was renamed to 'auto' in QAC 2.0");
  } else if (!(QAC_MODES as readonly string[]).includes(value.Mode)) {
    fail("Mode", `invalid Mode value: '${value.Mode}' (must be 'hitl' or 'auto')`);
  }

  for (const key of ["Agent", "What", "Why"] as const) {
    if (value[key] === "") fail(key, `trailer ${key} is empty`);
  }

  const { Agent: a, Mode: m, What: w, Why: y } = pos;
  if (a > m || m > w || w > y) {
    fail("order", "trailers must appear in fixed order: Agent, Mode, What, Why");
  } else if (m !== a + 1 || w !== m + 1 || y !== w + 1) {
    fail("order", "Agent, Mode, What and Why must be consecutive lines: one line each, with nothing between them");
  }

  // Walk back from Agent to the blank line that opens the footer: only other
  // trailers (e.g. a Signed-off-by added by git -s) may precede it.
  let s = a - 1;
  let bad = false;
  while (s >= 1 && !isBlank(lines[s - 1])) {
    const line = lines[s - 1];
    if (!/^[A-Za-z0-9-]+:/.test(line) && !/^[ \t]/.test(line)) {
      bad = true;
      break;
    }
    s--;
  }
  if (bad || s < 2) {
    fail("footer", "the trailers must be separated from the subject line (or body) by a blank line");
  }

  for (let j = y + 1; j <= lines.length; j++) {
    const line = lines[j - 1];
    if (isBlank(line)) {
      fail("footer", "the trailers must be the last block of the message: text found after them");
      break;
    }
    if (j === y + 1 && /^[ \t]/.test(line)) {
      fail("Why", "Why must fit on a single line: continuation line found");
      break;
    }
    if (/^[ \t]/.test(line)) continue;
    if (!/^[A-Za-z0-9-]+:/.test(line)) {
      fail("footer", `only other trailers (e.g. Co-Authored-By) may follow Why, found: ${line}`);
      break;
    }
  }

  return { valid: errors.length === 0, isAgentCommit: true, errors };
}

/** Validate the fields of a structured commit request before building a message. */
export function validateCommitInput(input: Partial<QacCommitInput>): QacValidationError[] {
  const errors: QacValidationError[] = [];
  if (!input.subject || input.subject.trim() === "") {
    errors.push({ path: "subject", message: "subject is required and must be non-empty" });
  } else if (/\r?\n/.test(input.subject.trim())) {
    errors.push({ path: "subject", message: "subject must be a single line" });
  }
  if (!input.agent || input.agent.trim() === "") {
    errors.push({ path: "agent", message: "agent is required and must be non-empty" });
  }
  if ((input.mode as string | undefined) === LEGACY_AUTONOMOUS) {
    errors.push({ path: "mode", message: "'autonomous' was renamed to 'auto' in QAC 2.0; use 'auto'" });
  } else if (!input.mode || !(QAC_MODES as readonly string[]).includes(input.mode)) {
    errors.push({ path: "mode", message: "mode is required and must be 'hitl' or 'auto'" });
  }
  if (!input.what || input.what.trim() === "") {
    errors.push({ path: "what", message: "what is required and must be non-empty" });
  }
  if (!input.why || input.why.trim() === "") {
    errors.push({ path: "why", message: "why is required and must be non-empty" });
  }
  if (input.trailers !== undefined) {
    if (!Array.isArray(input.trailers)) {
      errors.push({ path: "trailers", message: "trailers must be an array of 'Key: value' strings" });
    } else {
      input.trailers.forEach((t, i) => {
        const line = typeof t === "string" ? collapse(t) : "";
        const key = line.split(":")[0];
        if (!OTHER_TRAILER.test(line)) {
          errors.push({ path: `trailers.${i}`, message: `not a 'Key: value' trailer: ${String(t)}` });
        } else if ((QAC_TRAILER_ORDER as readonly string[]).includes(key)) {
          errors.push({ path: `trailers.${i}`, message: `${key} is a QAC trailer; pass it as its own field` });
        }
      });
    }
  }
  return errors;
}

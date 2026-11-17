/**
 * QAC (Qualified Agent Commits) schema logic — formatting and validation.
 *
 * This module is the single source of truth for the four-trailer schema inside
 * the server. It mirrors SPECIFICATION.md and enforcement/commit-msg-hook.sh so
 * that a commit produced by `qac_commit` always passes `qac_validate` and the
 * repository's commit-msg hook.
 */

/** The four QAC trailer keys, in their fixed, mandatory order. */
export const QAC_TRAILER_ORDER = ["Agent", "Mode", "What", "Why"] as const;

/** Allowed values for the `Mode` trailer. */
export const QAC_MODES = ["hitl", "autonomous"] as const;
export type QacMode = (typeof QAC_MODES)[number];

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

const TRAILER_LINE = (key: string) => new RegExp(`^${key}:[ \\t]*(.*)$`);

/**
 * Build a full commit message string from a subject, optional body and the four
 * QAC trailers. The trailer block is separated from the preceding content by a
 * blank line, exactly as git trailers require.
 */
export function formatCommitMessage(input: QacCommitInput): string {
  const subject = input.subject.trim();
  const parts: string[] = [subject];

  const body = input.body?.trim();
  if (body) parts.push(body);

  const trailerBlock = [
    `Agent: ${input.agent.trim()}`,
    `Mode: ${input.mode}`,
    `What: ${collapse(input.what)}`,
    `Why: ${collapse(input.why)}`,
  ].join("\n");

  parts.push(trailerBlock);
  return parts.join("\n\n") + "\n";
}

/** Collapse interior newlines/whitespace so a trailer stays on a single line. */
function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trailerValue(message: string, key: string): string | undefined {
  for (const line of message.split(/\r?\n/)) {
    const m = line.match(TRAILER_LINE(key));
    if (m) return m[1];
  }
  return undefined;
}

function trailerLineNumber(message: string, key: string): number | undefined {
  const lines = message.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (TRAILER_LINE(key).test(lines[i])) return i + 1;
  }
  return undefined;
}

/**
 * Validate a raw commit message against the QAC schema.
 *
 * Semantics match the enforcement hook: a message without an `Agent:` trailer
 * is a human commit and passes untouched. A message with `Agent:` must carry
 * all four trailers, a valid `Mode`, non-empty `Agent`/`What`/`Why`, and the
 * trailers must appear in the fixed order.
 */
export function validateCommitMessage(message: string): QacValidationResult {
  const errors: QacValidationError[] = [];
  const hasAgent = trailerLineNumber(message, "Agent") !== undefined;

  if (!hasAgent) {
    return { valid: true, isAgentCommit: false, errors: [] };
  }

  // 1. All four trailers present.
  for (const key of QAC_TRAILER_ORDER) {
    if (trailerLineNumber(message, key) === undefined) {
      errors.push({ path: key, message: `missing trailer: ${key}` });
    }
  }

  // 2. Mode is one of the allowed values.
  const mode = trailerValue(message, "Mode");
  if (mode !== undefined && !(QAC_MODES as readonly string[]).includes(mode.trim())) {
    errors.push({
      path: "Mode",
      message: `invalid Mode value: '${mode.trim()}' (must be 'hitl' or 'autonomous')`,
    });
  }

  // 3. Agent / What / Why are non-empty.
  for (const key of ["Agent", "What", "Why"] as const) {
    const value = trailerValue(message, key);
    if (value !== undefined && value.trim() === "") {
      errors.push({ path: key, message: `trailer '${key}' is empty` });
    }
  }

  // 4. Fixed trailer order: Agent < Mode < What < Why.
  const lines = QAC_TRAILER_ORDER.map((k) => trailerLineNumber(message, k));
  if (lines.every((n) => n !== undefined)) {
    const [a, m, w, y] = lines as number[];
    if (a > m || m > w || w > y) {
      errors.push({
        path: "order",
        message: "trailers must appear in fixed order: Agent, Mode, What, Why",
      });
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
  if (!input.mode || !(QAC_MODES as readonly string[]).includes(input.mode)) {
    errors.push({ path: "mode", message: "mode is required and must be 'hitl' or 'autonomous'" });
  }
  if (!input.what || input.what.trim() === "") {
    errors.push({ path: "what", message: "what is required and must be non-empty" });
  }
  if (!input.why || input.why.trim() === "") {
    errors.push({ path: "why", message: "why is required and must be non-empty" });
  }
  return errors;
}

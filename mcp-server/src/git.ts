/**
 * Thin, promise-based wrapper around the `git` CLI.
 *
 * Every QAC tool that touches a repository goes through here so that command
 * construction, working-directory handling and error surfacing live in one
 * place. We shell out to the real `git` binary (never a reimplementation) so
 * the produced commit object is byte-for-byte what the user's own git would
 * create — trailers included.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitRunOptions {
  /** Repository working directory. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Extra environment variables layered on top of the current process env. */
  env?: Record<string, string>;
}

export interface GitResult {
  stdout: string;
  stderr: string;
}

export class GitError extends Error {
  constructor(
    message: string,
    readonly args: string[],
    readonly stderr: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "GitError";
  }
}

/**
 * Run a git subcommand. Arguments are passed as an array (never a shell
 * string), so values containing spaces, quotes or newlines — exactly what QAC
 * `What`/`Why` trailers contain — are never re-parsed by a shell.
 */
export async function git(args: string[], options: GitRunOptions = {}): Promise<GitResult> {
  const cwd = options.cwd ?? process.cwd();
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      env: { ...process.env, ...options.env },
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string; code?: number };
    const stderr = e.stderr ?? "";
    throw new GitError(
      `git ${args.join(" ")} failed: ${stderr.trim() || e.message}`,
      args,
      stderr,
      typeof e.code === "number" ? e.code : undefined,
    );
  }
}

/** Resolve the repository root for a working directory, or throw if not a repo. */
export async function repoRoot(cwd?: string): Promise<string> {
  const { stdout } = await git(["rev-parse", "--show-toplevel"], { cwd });
  return stdout.trim();
}

/** The installed git version as a `[major, minor, patch]` tuple. */
export async function gitVersion(cwd?: string): Promise<[number, number, number]> {
  const { stdout } = await git(["--version"], { cwd });
  const match = stdout.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True when the installed git is at least the given version. */
export async function gitAtLeast(major: number, minor: number, cwd?: string): Promise<boolean> {
  const [maj, min] = await gitVersion(cwd);
  return maj > major || (maj === major && min >= minor);
}

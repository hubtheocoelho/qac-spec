#!/usr/bin/env node
/**
 * Link the SDK packages from the git submodule into this package's node_modules.
 *
 * The SDK is a private npm-workspaces monorepo: its packages reference each
 * other by version (`0.1.0`), which only resolves inside the submodule's own
 * `node_modules` (created by `npm --prefix ../third_party/... install`). So we
 * consume them by symlinking the built packages here, exactly as a package
 * manager would. Node then resolves each package's own dependencies (zod,
 * @modelcontextprotocol/sdk, sibling @mcp-orchestrator/* packages) from the
 * submodule, and both `tsc` and `tsx` pick up types/`main` from each
 * package.json with no path mapping.
 */

import { mkdirSync, rmSync, symlinkSync, existsSync, lstatSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const sdk = resolve(root, "..", "third_party", "mcp-orchestrator-sdk", "packages");
const scope = resolve(root, "node_modules", "@mcp-orchestrator");

const packages = ["core", "workflow", "mcp-server"];

mkdirSync(scope, { recursive: true });

for (const name of packages) {
  const target = resolve(sdk, name);
  const link = resolve(scope, name);
  if (!existsSync(resolve(target, "dist", "index.js"))) {
    // Not fatal: lets `npm install` (which runs this on postinstall) succeed
    // before the SDK is built. `npm run setup` builds first, then links.
    console.warn(`SDK package not built yet: ${name} — run "npm run sdk:build" (or "npm run setup").`);
    continue;
  }
  if (existsSync(link) || isSymlink(link)) rmSync(link, { recursive: true, force: true });
  symlinkSync(target, link, "dir");
  console.log(`linked @mcp-orchestrator/${name} -> ${target}`);
}

function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

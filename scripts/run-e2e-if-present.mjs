// scripts/run-e2e-if-present.mjs
// Playwright has no --passWithNoTests equivalent (unlike Vitest/Jest) and
// exits 1 on an empty suite — which would break `npm run test` (and CI's
// test job) before any real e2e spec exists yet. This checks for at least
// one *.spec.ts file under tests/e2e first; only invokes Playwright if one
// is present. A plain Node script (not a shell one-liner in package.json)
// so it behaves identically on Windows dev machines and Linux CI runners.

import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const e2eDir = "tests/e2e";

function hasSpecFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (hasSpecFiles(full)) return true;
    } else if (/\.spec\.(ts|tsx|js|jsx)$/.test(entry)) {
      return true;
    }
  }
  return false;
}

if (!hasSpecFiles(e2eDir)) {
  console.log("No e2e spec files yet under tests/e2e — skipping Playwright.");
  process.exit(0);
}

const result = spawnSync("npx", ["playwright", "test"], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);

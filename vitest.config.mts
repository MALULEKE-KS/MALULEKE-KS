// vitest.config.mts
// Drives npm run test:unit / test:integration / test:ai-evals
// (docs/PLATFORM-CONSTITUTION-v1.md §2 — 70/20/10 + the AI-eval fourth category).
// e2e is intentionally excluded here — that's Playwright (playwright.config.ts).
// .mts (not .ts) so Vite's native config loader treats this as ESM without
// needing "type": "module" in package.json, which would also affect
// postcss.config.js (still CommonJS).

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Integration tests write real rows, so they get their own disposable
// database: .env.test.local locally (see .env.example), the job's `env:`
// block in CI. Never .env.local — that file holds the production connection
// string. dotenv never overrides a var already set in process.env, so this
// is a no-op in CI.
loadEnv({ path: path.resolve(dirname, ".env.test.local") });

// Hard guard: outside CI, refuse to run against any database that isn't on
// this machine. A mistyped env file must fail loudly, not write test data
// into production.
if (!process.env.CI && process.env.DATABASE_URL) {
  const host = new URL(process.env.DATABASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `Refusing to run tests against non-local database host "${host}". ` +
        "Point .env.test.local at a local test database (docs/DEPLOYMENT.md).",
    );
  }
}

// The AI guide's integration tests share one piece of global state in the database
// (the concierge flag, the guide's rate-limit buckets and daily cap), so they run one
// file at a time. Everything else runs in parallel as before.
const GUIDE_INTEGRATION = ["tests/integration/guide-*.test.ts"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
  test: {
    globals: true,
    setupFiles: [],
    projects: [
      {
        extends: true,
        test: {
          name: "default",
          environment: "jsdom",
          // Never call the real screenshot service from a test run (lib/systems/screenshots.ts).
          env: { SCREENSHOT_SERVICE_URL: "off" },
          include: ["tests/**/*.test.{ts,tsx}"],
          exclude: ["node_modules/**", "tests/e2e/**", ".next/**", ...GUIDE_INTEGRATION],
        },
      },
      {
        extends: true,
        test: {
          name: "guide-serial",
          environment: "jsdom",
          env: { SCREENSHOT_SERVICE_URL: "off" },
          include: GUIDE_INTEGRATION,
          exclude: ["node_modules/**", ".next/**"],
          fileParallelism: false,
        },
      },
    ],
  },
});

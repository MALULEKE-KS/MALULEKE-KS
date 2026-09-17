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

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    exclude: ["node_modules/**", "tests/e2e/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});

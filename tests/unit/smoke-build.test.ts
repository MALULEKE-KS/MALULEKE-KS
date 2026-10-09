// @vitest-environment node
// tests/unit/smoke-build.test.ts
// The post-deploy smoke check (spec WP-110): every core page must report the build the
// platform itself reports. Run for real against a small local server standing in for the site.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

let server: Server;
let base = "";
let mode: "good" | "stale-then-new" | "login" | "mismatch" = "good";
let pulseCalls = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (mode === "login") {
      res.setHeader("content-type", "text/html");
      res.end("<!DOCTYPE html><html><body>Log in to Vercel</body></html>");
      return;
    }
    if (req.url?.startsWith("/api/v1/platform/pulse")) {
      pulseCalls += 1;
      const commit = mode === "stale-then-new" && pulseCalls < 3 ? "1111111" : "abc1234";
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ deployment: { commit } }));
      return;
    }
    res.setHeader("content-type", "text/html");
    res.end(`<footer>build <!-- -->${mode === "mismatch" && req.url === "/journey" ? "9999999" : "abc1234"}</footer>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

function smoke(expected?: string) {
  pulseCalls = 0;
  return new Promise<{ code: number | null; out: string }>((resolve) => {
    const child = spawn(process.execPath, ["scripts/smoke-build.mjs", base, ...(expected ? [expected] : [])], { env: { ...process.env, SMOKE_ATTEMPTS: "4", SMOKE_WAIT_SECONDS: "0.05" } });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

describe("scripts/smoke-build.mjs", () => {
  it("passes when every page reports the platform's build", async () => {
    mode = "good";
    const r = await smoke("abc1234def5678");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/ok\s+\/journey\s+build abc1234/);
  });

  it("waits for the new build to be served instead of failing on the old one", async () => {
    mode = "stale-then-new";
    const r = await smoke("abc1234def5678");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/waiting for abc1234/);
  });

  it("fails when one page is served from another build", async () => {
    mode = "mismatch";
    const r = await smoke("abc1234def5678");
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/FAIL \/journey\s+build 9999999 — expected abc1234/);
  });

  it("explains a login page instead of crashing on it", async () => {
    mode = "login";
    const r = await smoke("abc1234def5678");
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/behind a login/);
    expect(r.out).toMatch(/PRODUCTION_URL/);
    expect(r.out).not.toMatch(/SyntaxError/);
  });
});

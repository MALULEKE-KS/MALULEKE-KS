// scripts/smoke-build.mjs — after a production deploy, every core page must
// report the same build as the platform itself (spec WP-110): the footer's
// "build <sha>" on each route equals GET /api/v1/platform/pulse's commit.
// A route served from an older deploy, or a cache holding one, fails this.
//
// usage: node scripts/smoke-build.mjs <base-url> [expected-sha]

const [base, expected] = process.argv.slice(2);
if (!base) {
  console.error("usage: node scripts/smoke-build.mjs <base-url> [expected-sha]");
  process.exit(2);
}
const ROUTES = ["/", "/systems", "/journey", "/about", "/contact"];

const pulse = await fetch(new URL("/api/v1/platform/pulse", base), { cache: "no-store" }).then((r) => r.json());
const build = pulse?.deployment?.commit;
if (!build) {
  console.error("The pulse reports no build — is this a Vercel deployment?");
  process.exit(1);
}
if (expected && !expected.startsWith(build)) {
  console.error(`The pulse reports ${build}, expected ${expected.slice(0, 7)}.`);
  process.exit(1);
}

let failed = false;
for (const route of ROUTES) {
  const html = await fetch(new URL(route, base), { cache: "no-store" }).then((r) => r.text());
  const seen = /build\s*(?:<!--[^>]*-->\s*)*([0-9a-f]{7})/.exec(html)?.[1] ?? null;
  const ok = seen === build;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${route.padEnd(10)} build ${seen ?? "(none)"}${ok ? "" : ` — expected ${build}`}`);
}
process.exit(failed ? 1 : 0);

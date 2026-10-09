// scripts/smoke-build.mjs — after a production deploy, every core page must
// report the same build as the platform itself (spec WP-110): the footer's
// "build <sha>" on each route equals GET /api/v1/platform/pulse's commit.
// A route served from an older deploy, or a cache holding one, fails this.
//
// usage: node scripts/smoke-build.mjs <base-url> [expected-sha]
//
// The address must be one visitors can reach — the production domain, not a
// deployment's own *.vercel.app address (those sit behind Vercel's login). Right
// after a deploy the domain can still be serving the old build for a few seconds, so
// the pulse is asked again (SMOKE_ATTEMPTS times, SMOKE_WAIT_SECONDS apart) until it
// reports the expected build; only then are the pages compared with it.

const [base, expected] = process.argv.slice(2);
if (!base) {
  console.error("usage: node scripts/smoke-build.mjs <base-url> [expected-sha]");
  process.exitCode = 2;
}
const ROUTES = ["/", "/systems", "/journey", "/about", "/contact"];
const ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS ?? 12);
const WAIT_MS = Number(process.env.SMOKE_WAIT_SECONDS ?? 10) * 1000;

/** The pulse's build, or null with the reason printed. */
async function readBuild() {
  try {
    const res = await fetch(new URL("/api/v1/platform/pulse", base), { cache: "no-store" });
    const text = await res.text();
    try {
      return JSON.parse(text)?.deployment?.commit ?? null;
    } catch {
      console.error(
        `${base} answered with a page, not the pulse (HTTP ${res.status}). It is probably behind a login — set the repository variable PRODUCTION_URL to the production domain.`,
      );
      return null;
    }
  } catch (error) {
    console.error(`Could not reach ${base}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// Ends by setting the exit code, not process.exit(): that can crash Node on Windows with sockets still open.
async function main() {
  let build = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    build = await readBuild();
    if (build && (!expected || expected.startsWith(build))) break;
    if (build) console.log(`The pulse reports ${build}; waiting for ${expected.slice(0, 7)} (attempt ${attempt}/${ATTEMPTS})…`);
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, WAIT_MS));
  }
  if (!build) {
    console.error("The pulse reports no build — is this a Vercel deployment?");
    return 1;
  }
  if (expected && !expected.startsWith(build)) {
    console.error(`The pulse still reports ${build} after ${ATTEMPTS} tries, expected ${expected.slice(0, 7)}.`);
    return 1;
  }

  let failed = false;
  for (const route of ROUTES) {
    const html = await fetch(new URL(route, base), { cache: "no-store" }).then((r) => r.text());
    const seen = /build\s*(?:<!--[^>]*-->\s*)*([0-9a-f]{7})/.exec(html)?.[1] ?? null;
    const ok = seen === build;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${route.padEnd(10)} build ${seen ?? "(none)"}${ok ? "" : ` — expected ${build}`}`);
  }
  return failed ? 1 : 0;
}

if (base) process.exitCode = await main();

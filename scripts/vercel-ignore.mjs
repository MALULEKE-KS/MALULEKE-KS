// scripts/vercel-ignore.mjs — Vercel "Ignored Build Step" (vercel.ts ignoreCommand).
//
// Exit 0 = SKIP this build, exit 1 = BUILD. The project is on Vercel Hobby,
// which caps deployments per day, so builds that can't change the running
// site are skipped (docs/DEPLOYMENT.md "Deploy budget"):
//
//   1. Any environment: skip if every changed file is docs, tests, CI config
//      or Markdown — nothing the deployed app reads.
//   2. Preview only: also skip unless a UI path changed. CI already builds and
//      tests every PR, so a preview is only worth a deployment when there is
//      something to look at.
//
// Whenever the diff can't be determined (first deploy, shallow clone missing
// the previous commit), it builds. Skipping is the optimisation; building is
// the safe default.
//
// A redeploy of the commit already deployed always builds: nobody triggers one
// by accident — it's how new environment variables reach the running site
// (F1.8 found this skipped as "no file changes" and shown as Canceled).

import { execFileSync } from "node:child_process";

const BUILD = 1;
const SKIP = 0;

const env = process.env.VERCEL_ENV ?? "unknown";
const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA;

const NEVER_AFFECTS_RUNTIME = [/^docs\//, /^tests\//, /^\.github\//, /\.md$/i, /^\.claude\//, /^\.vscode\//];
const UI_PATHS = [
  /^app\/\((public|admin)\)\//,
  /^app\/(layout|globals|not-found|icon)\b/,
  /^components\//,
  /^public\//,
  /^hooks\//,
  /^lib\/content\//,
  /^tailwind\.config\./,
  /^postcss\.config\./,
];

function decide(message, code) {
  console.log(`[vercel-ignore] env=${env} → ${code === SKIP ? "SKIP" : "BUILD"}: ${message}`);
  process.exit(code);
}

if (!previous) decide("no previous deployment to compare against", BUILD);
if (current && previous === current) {
  decide("redeploy of the same commit — deliberate (e.g. new environment variables)", BUILD);
}

let files;
try {
  files = execFileSync("git", ["diff", "--name-only", previous, "HEAD"], { encoding: "utf8" })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
} catch {
  decide(`previous commit ${previous.slice(0, 7)} not in this clone`, BUILD);
}

if (files.length === 0) decide("no file changes", SKIP);

const runtimeFiles = files.filter((f) => !NEVER_AFFECTS_RUNTIME.some((re) => re.test(f)));
if (runtimeFiles.length === 0) decide(`only docs/tests/CI changed (${files.length} files)`, SKIP);

if (env === "preview" && !runtimeFiles.some((f) => UI_PATHS.some((re) => re.test(f)))) {
  decide(`no UI changes in this preview (${runtimeFiles.length} backend files; CI covers them)`, SKIP);
}

decide(`${runtimeFiles.length} runtime file(s) changed`, BUILD);

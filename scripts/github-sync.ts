// scripts/github-sync.ts — run the GitHub sync job by hand (operator use, #95).
// The sync itself lives in lib/jobs/github-sync.ts and runs daily through the
// scheduler (lib/jobs/registry.ts); this runs the same job, with the same lock
// and run record, marked as started by a script.
//
//   npm run sync:github            (local dev database, .env.development.local)

import { runNamedJob } from "../lib/jobs/registry";
import { db } from "../lib/db";

// exitCode, not exit(): let open handles close cleanly (Windows asserts otherwise).
runNamedJob("github.sync", { kind: "script" })
  .then((run) => {
    console.log(JSON.stringify(run, null, 2));
    process.exitCode = run.status === "succeeded" ? 0 : 1;
  })
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

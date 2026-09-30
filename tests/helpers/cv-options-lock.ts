// tests/helpers/cv-options-lock.ts
// CvOptions is one shared row (#92). Test files run in parallel, so a file that
// hides a CV option would break another file downloading the generated CV at
// the same moment. Files that only rely on the defaults hold a SHARED lock;
// the file that changes the options holds an EXCLUSIVE one — they serialise
// only where they actually conflict. A transaction-scoped Postgres advisory
// lock, held open on its own connection for the whole file.

import { db } from "@/lib/db";

const LOCK_KEY = 92; // the issue that introduced CvOptions

export async function holdCvOptionsLock(mode: "shared" | "exclusive"): Promise<() => Promise<void>> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let acquired!: () => void;
  const ready = new Promise<void>((resolve) => (acquired = resolve));

  const held = db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        mode === "shared" ? `SELECT pg_advisory_xact_lock_shared(${LOCK_KEY})` : `SELECT pg_advisory_xact_lock(${LOCK_KEY})`,
      );
      acquired();
      await released;
    },
    { maxWait: 10 * 60_000, timeout: 10 * 60_000 },
  );

  await Promise.race([ready, held]);
  return async () => {
    release();
    await held;
  };
}

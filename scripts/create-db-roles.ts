// scripts/create-db-roles.ts
// F1.8 (#76): creates the two login roles the application connects as, with
// generated passwords, and prints their connection strings — for the owner
// to paste into Vercel as Sensitive environment variables. Run it in your
// own terminal; the passwords are never stored, committed, or shown elsewhere.
//
//   npx dotenv -e .env.local -- npx tsx scripts/create-db-roles.ts            # first time
//   npx dotenv -e .env.local -- npx tsx scripts/create-db-roles.ts --rotate   # new passwords
//
// Needs the migration 20260919090000_least_privilege_roles applied first (it
// creates the platform_runtime / platform_public group roles and their
// grants). Connects as the owner over DATABASE_URL_UNPOOLED; the printed URLs
// reuse DATABASE_URL's pooled host and options with the new credentials.

import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const LOGINS = [
  { login: "app_runtime", group: "platform_runtime", envVar: "DATABASE_URL_RUNTIME" },
  { login: "app_public", group: "platform_public", envVar: "DATABASE_URL_PUBLIC" },
] as const;

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main() {
  const rotate = process.argv.includes("--rotate");
  const ownerDirect = process.env.DATABASE_URL_UNPOOLED;
  const pooled = process.env.DATABASE_URL;
  if (!ownerDirect || !pooled) fail("DATABASE_URL and DATABASE_URL_UNPOOLED must be set (use: npx dotenv -e .env.local -- ...).");

  const owner = new PrismaClient({ datasourceUrl: ownerDirect });
  try {
    const groups = await owner.$queryRaw<{ rolname: string }[]>`
      SELECT rolname FROM pg_roles WHERE rolname IN ('platform_runtime', 'platform_public')`;
    if (groups.length !== 2) {
      fail("The platform_runtime / platform_public roles don't exist yet — deploy the F1.8 migration first.");
    }

    const lines: string[] = [];
    for (const { login, group, envVar } of LOGINS) {
      // base64url: no quote characters, ~256 bits of entropy.
      const password = randomBytes(32).toString("base64url");
      const [exists] = await owner.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pg_roles WHERE rolname = ${login}`;

      if (exists && exists.n > 0) {
        if (!rotate) fail(`Role ${login} already exists. Re-run with --rotate to give it a new password.`);
        await owner.$executeRawUnsafe(`ALTER ROLE ${login} WITH LOGIN PASSWORD '${password}'`);
      } else {
        await owner.$executeRawUnsafe(`CREATE ROLE ${login} WITH LOGIN PASSWORD '${password}'`);
      }
      await owner.$executeRawUnsafe(`GRANT ${group} TO ${login}`);

      const url = new URL(pooled);
      url.username = login;
      url.password = password;
      lines.push(`${envVar}=${url.toString()}`);

      // Prove it: connect as the new role, check its group, and that a raw table is refused.
      const check = new PrismaClient({ datasourceUrl: url.toString() });
      try {
        const [who] = await check.$queryRaw<{ member: boolean }[]>`
          SELECT pg_has_role(current_user, ${group}, 'MEMBER') AS member`;
        if (!who?.member) fail(`${login} connected but isn't a member of ${group}.`);
        if (group === "platform_public") {
          const refused = await check.inquiry.count().then(
            () => false,
            () => true,
          );
          if (!refused) fail(`${login} can read the Inquiry table — it must not. Stopping.`);
        }
      } finally {
        await check.$disconnect();
      }
      console.log(`✔ ${login} (${group}) ${exists && exists.n > 0 ? "rotated" : "created"} and verified`);
    }

    console.log("\nAdd these two to Vercel → Project → Settings → Environment Variables,");
    console.log("marked Sensitive, for Production and Preview. Then redeploy once.\n");
    for (const line of lines) console.log(line);
    console.log("\nThey're shown only here and now. Don't paste them anywhere else.\n");
  } finally {
    await owner.$disconnect();
  }
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));

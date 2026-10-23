// tests/e2e/admin.spec.ts
// The admin panel, seen as the owner sees it (the admin pass, D-057): every
// panel page at a phone and a laptop width renders for a signed-in admin,
// pushes nothing sideways, has no serious accessibility violation, and leaves a
// screenshot on the pull request (the hero-screenshots artifact, admin/).
//
// CI only: it signs in a disposable admin it creates on CI's own test database,
// minting the session cookie the way verify-2fa does (lib/auth/session.ts) with
// CI's test-only signing key. Never against the owner's local database or
// production, and never with the owner's credentials.

import { createHmac, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { seriousViolations } from "./axe";

const PAGES = [
  "/admin",
  "/admin/systems",
  "/admin/organizations",
  "/admin/inquiries",
  "/admin/timeline",
  "/admin/cv",
  "/admin/profile",
  "/admin/content",
  "/admin/numbers",
  "/admin/freshness",
  "/admin/jobs",
  "/admin/guide",
  "/admin/settings",
  "/admin/activity-log",
  "/admin/account",
];

test.skip(!process.env.CI || !process.env.NEXTAUTH_SECRET, "CI only: signs in a disposable admin on the test database");

let cookie = "";
let systemPath = "";

function sessionCookie(adminUserId: string, version: number) {
  const now = Date.now();
  const json = Buffer.from(JSON.stringify({ sub: adminUserId, iat: now, lastActivity: now, version, sid: randomBytes(16).toString("base64url") })).toString("base64url");
  return `${json}.${createHmac("sha256", process.env.NEXTAUTH_SECRET!).update(json).digest("base64url")}`;
}

test.beforeAll(async () => {
  const db = new PrismaClient();
  try {
    const admin = await db.adminUser.upsert({
      where: { email: "e2e-admin@example.com" },
      create: { email: "e2e-admin@example.com", passwordHash: "unused-sessions-are-minted", twoFactorEnabled: true },
      update: {},
    });
    cookie = sessionCookie(admin.id, admin.sessionVersion);
    const system = await db.system.findFirst({ where: { slug: "e2e-stress" }, select: { id: true } });
    if (system) systemPath = `/admin/systems/${system.id}`;
  } finally {
    await db.$disconnect();
  }
});

async function signIn(page: Page) {
  await page.context().addCookies([{ name: "admin_session", value: cookie, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
}


for (const [name, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["laptop", { width: 1440, height: 900 }],
] as const) {
  test.describe(`the admin on a ${name}`, () => {
    test.use({ viewport });
    for (const path of [...PAGES, "SYSTEM"]) {
      test(`${path === "SYSTEM" ? "a system's editor" : path} renders, fits and passes axe`, async ({ page }) => {
        test.setTimeout(180_000);
        const target = path === "SYSTEM" ? systemPath : path;
        test.skip(!target, "no fixture system");
        await signIn(page);
        await page.goto(target, { waitUntil: "networkidle" });
        await expect(page).not.toHaveURL(/\/admin\/login/);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const file = (path === "SYSTEM" ? "system-editor" : path.replace(/^\/admin\/?/, "") || "overview").replaceAll("/", "-");
        await page.screenshot({ path: `hero-screenshots/admin/${file}-${name}.png`, fullPage: true });

        const { scrollWidth, width } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth }));
        expect(scrollWidth, `${target} is wider than the screen`).toBeLessThanOrEqual(width + 1);
        // The phone dock is checked on its own, then set aside while the page is (tests/e2e/axe.ts).
        expect(await seriousViolations(page)).toEqual([]);
      });
    }
  });
}

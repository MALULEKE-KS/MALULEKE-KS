// tests/integration/github-sync.test.ts
// #95 (F4.2) — the GitHub sync against a fake GitHub (injected fetch): private
// and collaborated repos (BR-1.7, BR-1.11), drafts only (BR-1.6), curated
// fields never overwritten (BR-8.2), renames keep links (BR-1.14), metadata
// and ISO-week activity, unmapped owners reported, rate limits fail the run.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { GithubRateLimitError, syncGithub, toIsoWeeks, type FetchLike } from "@/lib/jobs/github-sync";

const RUN = `gs${Date.now().toString(36)}`;
const OWNER = `${RUN}-owner`; // the owner's own account
const PARTNER = `${RUN}-partner`; // someone else's org, mapped to an Organization
const STRANGER = `${RUN}-stranger`; // an org with no Organization row
const baseId = Date.now() % 1_000_000_000;

type Repo = Record<string, unknown>;
function repo(n: number, owner: string, name: string, extra: Repo = {}): Repo {
  return {
    id: baseId + n,
    name,
    full_name: `${owner}/${name}`,
    owner: { login: owner },
    description: `${name} description`,
    html_url: `https://github.com/${owner}/${name}`,
    homepage: null,
    private: false,
    fork: false,
    archived: false,
    language: "TypeScript",
    topics: ["platform"],
    stargazers_count: 3,
    pushed_at: "2026-09-25T10:00:00Z",
    ...extra,
  };
}

// Sunday 2026-09-20 00:00 UTC: GitHub's week. Sunday belongs to the ISO week of Monday 09-14.
const SUNDAY = Date.UTC(2026, 8, 20) / 1000;

function fakeGithub(
  repos: Repo[],
  options: { pendingStats?: string[]; rateLimited?: boolean; refusingOrg?: string; gone?: string[]; manifests?: Record<string, Record<string, string>> } = {},
): FetchLike {
  return async (url) => {
    const path = new URL(url).pathname + new URL(url).search;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (options.gone?.some((full) => path === `/repos/${full}`)) return json({ message: "Not Found" }, 404);
    if (options.rateLimited) {
      return new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(SUNDAY + 3600) } });
    }
    if (options.refusingOrg && path.startsWith(`/orgs/${options.refusingOrg}/`)) {
      return json({ message: `The '${options.refusingOrg}' organization forbids access via a personal access token (classic) whose lifetime is too long.` }, 403);
    }
    if (path.startsWith("/user/repos")) return json(new URL(url).searchParams.get("page") === "1" ? repos : []);
    if (path.startsWith("/orgs/")) return json({ message: "Not Found" }, 404);
    if (path.startsWith("/users/")) return json([]);
    // Manifests (WP-103): the raw file when the test supplies one, otherwise "not found".
    const manifest = /^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/.exec(path);
    if (manifest) {
      const body = options.manifests?.[manifest[1]!]?.[manifest[2]!];
      return body === undefined ? json({ message: "Not Found" }, 404) : new Response(body, { status: 200 });
    }
    const lang = /^\/repos\/(.+)\/languages$/.exec(path);
    if (lang) return json({ TypeScript: 1200, CSS: 300 });
    const stats = /^\/repos\/(.+)\/stats\/commit_activity$/.exec(path);
    if (stats) {
      if (options.pendingStats?.includes(stats[1]!)) return new Response(null, { status: 202 });
      return json([{ week: SUNDAY, total: 6, days: [1, 2, 0, 0, 0, 0, 3] }]);
    }
    return json({ message: `unexpected ${path}` }, 500);
  };
}

const sync = (repos: Repo[], options?: Parameters<typeof fakeGithub>[1]) =>
  syncGithub({ tokens: ["test-token"], ownedLogins: [OWNER], fetch: fakeGithub(repos, options) });
const byRepo = (n: number) => db.system.findUnique({ where: { githubRepoId: baseId + n }, include: { repoRelationship: true } });

let clientOrgId: string;
beforeAll(async () => {
  await db.organization.create({ data: { name: `${RUN} Personal`, slug: `${RUN}-personal`, githubLogins: [OWNER] } });
  clientOrgId = (await db.organization.create({ data: { name: `${RUN} Partner`, slug: `${RUN}-partner-org`, githubLogins: [PARTNER], isClient: true } })).id;
});

afterAll(async () => {
  await db.skillOnSystem.deleteMany({ where: { skill: { name: { startsWith: RUN } } } });
  await db.skill.deleteMany({ where: { name: { startsWith: RUN } } });
  await db.system.updateMany({ where: { githubOwnerLogin: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("ISO weeks", () => {
  it("re-buckets GitHub's Sunday-to-Saturday week by day into Monday weeks", () => {
    const weeks = toIsoWeeks([{ week: SUNDAY, days: [1, 2, 0, 0, 0, 0, 3] }]);
    expect(Object.fromEntries(weeks)).toEqual({ "2026-09-14": 1, "2026-09-21": 5 });
  });
});

describe("the sync (#95)", () => {
  const repos = [
    repo(1, OWNER, `${RUN}-public-app`, { homepage: "https://app.example.com" }),
    repo(2, OWNER, `${RUN}-private-app`, { private: true }),
    repo(3, OWNER, `${RUN}-forked`, { fork: true }),
    repo(4, PARTNER, `${RUN}-client-work`),
    repo(5, STRANGER, `${RUN}-unknown-work`),
  ];

  it("shows the owner's public repos by default, keeps private (setting), client and collaborated work hidden; skips forks; reports unmapped owners", async () => {
    const summary = await sync(repos, { pendingStats: [`${OWNER}/${RUN}-private-app`] });
    expect(summary).toMatchObject({ created: 3, skippedForks: 1, unmappedOwners: [STRANGER], activityPending: [`${OWNER}/${RUN}-private-app`], errors: [], accountErrors: [] });

    const pub = await byRepo(1);
    expect(pub).toMatchObject({
      contentStatus: "PUBLISHED", // BR-1.6 — shown by default
      needsCuration: true, // …and flagged as new for the admin
      repoPrivate: false,
      githubFullName: `${OWNER}/${RUN}-public-app`,
      githubOwnerLogin: OWNER,
      githubStars: 3,
      githubTopics: ["platform"],
      liveUrl: "https://app.example.com",
      clientVisibility: "PUBLIC",
    });
    expect(pub!.githubLanguages).toEqual({ TypeScript: 1200, CSS: 300 });
    expect(pub!.repoRelationship?.key).toBe("owner");

    expect(pub!.statusId).toBe((await db.status.findUniqueOrThrow({ where: { key: "on_github" } })).id); // honest status, not "Planned"
    expect(await byRepo(2)).toMatchObject({ repoPrivate: true, contentStatus: "DRAFT", needsCuration: true }); // BR-1.6 default public-only: private waits for review
    expect(await byRepo(3)).toBeNull();
    expect(await byRepo(5)).toBeNull();

    const client = await byRepo(4);
    expect(client).toMatchObject({ organizationId: clientOrgId, clientVisibility: "REQUIRES_APPROVAL", contentStatus: "DRAFT" }); // BR-1.2 — waits for approval
    expect(client!.repoRelationship?.key).toBe("collaborator"); // BR-1.11 — publishing waits for permission
    expect(client!.ownerPermission).not.toBe("NOT_REQUIRED");
  });

  it("records weekly activity in ISO weeks", async () => {
    const pub = await byRepo(1);
    const weeks = await db.systemActivityWeek.findMany({ where: { systemId: pub!.id }, orderBy: { weekStart: "asc" } });
    expect(weeks.map((w) => [w.weekStart.toISOString().slice(0, 10), w.commits])).toEqual([["2026-09-14", 1], ["2026-09-21", 5]]);
    expect(await db.systemActivityWeek.count({ where: { systemId: (await byRepo(2))!.id } })).toBe(0); // 202: next run
  });

  it("a second run updates facts, never curated fields, and creates no duplicates (BR-8.2)", async () => {
    const pub = await byRepo(1);
    // As the admin's edit does (app/api/v1/admin/systems/[id]): curating clears needsCuration.
    await db.system.update({ where: { id: pub!.id }, data: { description: "Curated by the owner.", liveUrl: "https://curated.example.com", name: "Curated Name", needsCuration: false } });

    const summary = await sync(repos.map((r) => (r.id === baseId + 1 ? { ...r, stargazers_count: 9, description: "GitHub changed it", homepage: "https://other.example.com" } : r)));
    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(3);

    expect(await byRepo(1)).toMatchObject({ description: "Curated by the owner.", liveUrl: "https://curated.example.com", name: "Curated Name", githubStars: 9 });
    expect(await db.system.count({ where: { githubOwnerLogin: { startsWith: RUN } } })).toBe(3);
  });

  it("follows a repo rename with a redirect — unless the admin chose the slug (BR-1.14)", async () => {
    const pub = await byRepo(1);
    const priv = await byRepo(2);
    await db.system.update({ where: { id: priv!.id }, data: { slug: `${RUN}-chosen-by-admin` } });

    await sync(
      repos.map((r) =>
        r.id === baseId + 1
          ? { ...r, name: `${RUN}-renamed-app`, full_name: `${OWNER}/${RUN}-renamed-app` }
          : r.id === baseId + 2
            ? { ...r, name: `${RUN}-private-renamed`, full_name: `${OWNER}/${RUN}-private-renamed` }
            : r,
      ),
    );
    const renamed = await byRepo(1);
    expect(renamed!.slug).toBe(`${RUN}-renamed-app`);
    expect(await db.systemSlugHistory.findUnique({ where: { slug: pub!.slug } })).toMatchObject({ systemId: pub!.id });
    expect((await byRepo(2))!.slug).toBe(`${RUN}-chosen-by-admin`);
  });

  it("stops the whole run on a GitHub rate limit, so the job fails with the reset time", async () => {
    await expect(sync(repos, { rateLimited: true })).rejects.toBeInstanceOf(GithubRateLimitError);
  });

  it("an account that refuses the token is reported with GitHub's reason; the rest still syncs", async () => {
    const REFUSING = `${RUN}-refusing`;
    const summary = await syncGithub({
      tokens: ["test-token"],
      ownedLogins: [REFUSING, OWNER],
      fetch: fakeGithub([repo(30, OWNER, `${RUN}-still-synced`)], { refusingOrg: REFUSING }),
    });
    expect(summary.accountErrors).toHaveLength(1);
    expect(summary.accountErrors[0]!.account).toBe(REFUSING);
    expect(summary.accountErrors[0]!.error).toMatch(/403 .*forbids access via a personal access token \(classic\)/);
    expect(summary).toMatchObject({ created: 1, errors: [] });
    expect(await byRepo(30)).toMatchObject({ contentStatus: "PUBLISHED" });
  });

  it("an account that refuses the token still has its public repos synced — read anonymously, public data only", async () => {
    const REFUSING = `${RUN}-refusing2`;
    await db.organization.create({ data: { name: `${RUN} Refusing`, slug: `${RUN}-refusing-org`, githubLogins: [REFUSING] } });
    const pub = repo(70, REFUSING, `${RUN}-public-in-refusing`);
    const priv = repo(71, REFUSING, `${RUN}-private-in-refusing`, { private: true });
    const authorized: string[] = [];
    const base = fakeGithub([repo(72, OWNER, `${RUN}-owner-repo`)], { refusingOrg: REFUSING });
    const fetch: FetchLike = async (url, init) => {
      const path = new URL(url).pathname;
      const auth = new Headers(init?.headers).get("authorization");
      if (path === `/users/${REFUSING}/repos`) {
        authorized.push(`list:${auth ? "token" : "anonymous"}`);
        return new Response(JSON.stringify(new URL(url).searchParams.get("page") === "1" ? [pub, priv] : []), { status: 200 });
      }
      if (path.startsWith(`/repos/${REFUSING}/`)) authorized.push(auth ? "token" : "anonymous");
      return base(url, init);
    };
    const summary = await syncGithub({ tokens: ["test-token"], ownedLogins: [REFUSING, OWNER], fetch });
    expect(summary.accountErrors.map((e) => e.account)).toEqual([REFUSING]);
    expect(await byRepo(70)).toMatchObject({ contentStatus: "PUBLISHED", repoPrivate: false });
    expect(await byRepo(71)).toBeNull(); // a private repo is never read anonymously
    expect(authorized).toContain("list:anonymous");
    expect(authorized.filter((a) => a === "token")).toEqual([]); // every read of that account's repos was anonymous
  });

  it("a live system whose repo is gone from GitHub leaves the site — hidden and flagged, never deleted; nothing else is touched", async () => {
    const goneRepo = repo(40, OWNER, `${RUN}-deleted-later`);
    const stillThere = repo(41, OWNER, `${RUN}-not-listed-but-exists`);
    await sync([goneRepo, stillThere]);
    expect(await byRepo(40)).toMatchObject({ contentStatus: "PUBLISHED" });

    // Next run: neither is listed; GitHub says one is gone, the other answers otherwise.
    // The token sees a private repo in the account, so "not found" means deleted.
    const summary = await syncGithub({
      tokens: ["test-token"],
      ownedLogins: [OWNER],
      fetch: fakeGithub([repo(49, OWNER, `${RUN}-private-sentinel`, { private: true })], { gone: [`${OWNER}/${RUN}-deleted-later`] }),
    });
    expect(summary.removedFromGithub).toEqual([`${RUN}-deleted-later`]);
    expect(await byRepo(40)).toMatchObject({ contentStatus: "DRAFT", needsCuration: true });
    expect(await byRepo(41)).toMatchObject({ contentStatus: "PUBLISHED" });
  });

  it("where the token sees no private repos, a repo that stops answering went private — kept on the site as private, never hidden as gone (D-021)", async () => {
    const r = repo(48, OWNER, `${RUN}-went-private-unseen`);
    await sync([r]);
    expect(await byRepo(48)).toMatchObject({ contentStatus: "PUBLISHED", repoPrivate: false });

    const summary = await syncGithub({ tokens: ["test-token"], ownedLogins: [OWNER], fetch: fakeGithub([], { gone: [`${OWNER}/${RUN}-went-private-unseen`] }) });
    expect(summary.madePrivate).toContain(`${RUN}-went-private-unseen`);
    expect(summary.removedFromGithub).not.toContain(`${RUN}-went-private-unseen`);
    expect(await byRepo(48)).toMatchObject({ contentStatus: "PUBLISHED", repoPrivate: true, needsCuration: true, githubGoneAt: null });
  });

  it("switching private repos on shows the private work already synced and never curated — never what the owner hid; homes with no private access are reported", async () => {
    const waiting = repo(46, OWNER, `${RUN}-private-waiting`, { private: true });
    const ownerHid = repo(47, OWNER, `${RUN}-private-owner-hid`, { private: true });
    await sync([waiting, ownerHid]);
    expect(await byRepo(46)).toMatchObject({ contentStatus: "DRAFT", repoPrivate: true });
    await db.system.update({ where: { githubRepoId: baseId + 47 }, data: { needsCuration: false } });

    const summary = await syncGithub({ tokens: ["test-token"], ownedLogins: [OWNER, `${RUN}-no-private`], newRepoVisibility: "public-and-private", fetch: fakeGithub([waiting, ownerHid]) });
    expect(summary.madePublic).toContain(`${RUN}-private-waiting`);
    expect(await byRepo(46)).toMatchObject({ contentStatus: "PUBLISHED", repoPrivate: true });
    expect(await byRepo(47)).toMatchObject({ contentStatus: "DRAFT" });
    expect(summary.noPrivateAccess).toEqual([`${RUN}-no-private`]);
  });

  // V1 finalization (owner, 2026-10-02): GitHub's real state, kept current.
  it("a repo hidden only because it was private is shown once it goes public; an owner's own hide is never undone", async () => {
    const wasPrivate = repo(50, OWNER, `${RUN}-went-public`, { private: true });
    const ownerHid = repo(51, OWNER, `${RUN}-owner-hid`, { private: true });
    await sync([wasPrivate, ownerHid]);
    expect(await byRepo(50)).toMatchObject({ contentStatus: "DRAFT", repoPrivate: true });
    // The owner reviews 51 and keeps it hidden (curated).
    await db.system.update({ where: { githubRepoId: baseId + 51 }, data: { needsCuration: false } });

    const summary = await sync([{ ...wasPrivate, private: false }, { ...ownerHid, private: false }]);
    expect(summary.madePublic).toEqual([`${RUN}-went-public`]);
    expect(await byRepo(50)).toMatchObject({ contentStatus: "PUBLISHED", repoPrivate: false });
    expect(await byRepo(51)).toMatchObject({ contentStatus: "DRAFT", repoPrivate: false });
  });

  it("an uncurated description follows GitHub's — never over a write-up or the owner's words", async () => {
    const r = repo(52, OWNER, `${RUN}-described`);
    await sync([r]);
    await sync([{ ...r, description: "GitHub's new words" }]);
    expect(await byRepo(52)).toMatchObject({ description: "GitHub's new words" });

    await db.system.update({ where: { githubRepoId: baseId + 52 }, data: { description: "Generated from the repo.", writeupGeneratedAt: new Date() } });
    await sync([{ ...r, description: "GitHub again" }]);
    expect(await byRepo(52)).toMatchObject({ description: "Generated from the repo." });
  });

  it("a public repo deleted from GitHub leaves every public list — written up or not — and returns if it comes back", async () => {
    const hidden = repo(53, OWNER, `${RUN}-never-written-up`);
    await sync([hidden]);
    // Not written up: the owner hid the system, but the repo is still listed among public repos.
    await db.system.update({ where: { githubRepoId: baseId + 53 }, data: { contentStatus: "DRAFT", needsCuration: false } });
    const listed = () => db.publicGithubRepo.findUnique({ where: { fullName: `${OWNER}/${RUN}-never-written-up` } });
    expect(await listed()).not.toBeNull();

    const summary = await syncGithub({ tokens: ["test-token"], ownedLogins: [OWNER], fetch: fakeGithub([repo(49, OWNER, `${RUN}-private-sentinel`, { private: true })], { gone: [`${OWNER}/${RUN}-never-written-up`] }) });
    expect(summary.removedFromGithub).toContain(`${RUN}-never-written-up`);
    expect((await byRepo(53))!.githubGoneAt).not.toBeNull();
    expect(await byRepo(53)).toMatchObject({ contentStatus: "DRAFT" }); // never deleted (BR-1.9)
    expect(await listed()).toBeNull();

    await sync([hidden]); // listed on GitHub again
    expect((await byRepo(53))!.githubGoneAt).toBeNull();
    expect(await listed()).not.toBeNull();
  });

  it("a skill is proved by the repo's own manifest — and loses that proof when the dependency goes; the owner's links are never touched", async () => {
    const r = repo(60, OWNER, `${RUN}-manifested`);
    const full = `${OWNER}/${RUN}-manifested`;
    const skill = await db.skill.create({ data: { name: `${RUN} Playwright`, categoryId: (await db.skillCategory.findFirstOrThrow()).id, aliases: ["@playwright/test"] } });
    const ownerPick = await db.skill.create({ data: { name: `${RUN} Chosen`, categoryId: (await db.skillCategory.findFirstOrThrow()).id, aliases: [] } });

    const withPlaywright = { [full]: { "package.json": JSON.stringify({ devDependencies: { "@playwright/test": "1.50.0" } }), "requirements.txt": "numpy==2" } };
    const first = await sync([r], { manifests: withPlaywright });
    const system = await byRepo(60);
    expect(system!.githubDependencies).toEqual(["@playwright/test", "numpy"]);
    expect(first.skillLinks.added).toBeGreaterThanOrEqual(1);
    expect(await db.skillOnSystem.findUnique({ where: { skillId_systemId: { skillId: skill.id, systemId: system!.id } } })).toMatchObject({ source: "manifest" });

    // The owner links another skill by hand.
    await db.skillOnSystem.create({ data: { skillId: ownerPick.id, systemId: system!.id, source: "owner" } });

    // The dependency is removed from the repo.
    const second = await sync([r], { manifests: { [full]: { "package.json": JSON.stringify({ dependencies: { next: "16" } }) } } });
    expect(second.skillLinks.removed).toBeGreaterThanOrEqual(1);
    expect(await db.skillOnSystem.findUnique({ where: { skillId_systemId: { skillId: skill.id, systemId: system!.id } } })).toBeNull();
    expect(await db.skillOnSystem.findUnique({ where: { skillId_systemId: { skillId: ownerPick.id, systemId: system!.id } } })).toMatchObject({ source: "owner" });
  });

  it("reads each repo with a token that can see it — one token per GitHub owner", async () => {
    const seen: string[] = [];
    const onlyFor = (token: string, list: Repo[]): FetchLike => async (url, init) => {
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      const path = new URL(url).pathname;
      if (auth !== `Bearer ${token}`) {
        if (path.startsWith("/user/repos")) return new Response("[]", { status: 200 });
      }
      if (path.startsWith("/repos/")) seen.push(`${token}:${path.split("/").slice(2, 4).join("/")}`);
      return fakeGithub(auth === `Bearer ${token}` ? list : [])(url, init);
    };
    const a = repo(20, OWNER, `${RUN}-token-a`, { private: true });
    const b = repo(21, PARTNER, `${RUN}-token-b`, { private: true });
    const fetchBoth: FetchLike = (url, init) => {
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      return (auth === "Bearer token-a" ? onlyFor("token-a", [a]) : onlyFor("token-b", [b]))(url, init);
    };
    const summary = await syncGithub({ tokens: ["token-a", "token-b"], ownedLogins: [OWNER], fetch: fetchBoth });
    expect(summary.created).toBe(2);
    expect(seen).toContain(`token-a:${OWNER}/${RUN}-token-a`);
    expect(seen).toContain(`token-b:${PARTNER}/${RUN}-token-b`);
    expect(seen.some((s) => s.startsWith("token-a:") && s.includes("token-b"))).toBe(false);
  });

  it("writes are attributed to the system in the audit trail", async () => {
    const pub = await byRepo(1);
    const entry = await db.activityLog.findFirstOrThrow({ where: { entityType: "System", entityId: pub!.id, action: "system.create" } });
    expect(entry.actorType).toBe("SYSTEM");
  });
});

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

function fakeGithub(repos: Repo[], options: { pendingStats?: string[]; rateLimited?: boolean; refusingOrg?: string } = {}): FetchLike {
  return async (url) => {
    const path = new URL(url).pathname + new URL(url).search;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (options.rateLimited) {
      return new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(SUNDAY + 3600) } });
    }
    if (options.refusingOrg && path.startsWith(`/orgs/${options.refusingOrg}/`)) {
      return json({ message: `The '${options.refusingOrg}' organization forbids access via a personal access token (classic) whose lifetime is too long.` }, 403);
    }
    if (path.startsWith("/user/repos")) return json(new URL(url).searchParams.get("page") === "1" ? repos : []);
    if (path.startsWith("/orgs/")) return json({ message: "Not Found" }, 404);
    if (path.startsWith("/users/")) return json([]);
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
    await db.system.update({ where: { id: pub!.id }, data: { description: "Curated by the owner.", liveUrl: "https://curated.example.com", name: "Curated Name" } });

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

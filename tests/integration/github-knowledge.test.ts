// @vitest-environment node
// tests/integration/github-knowledge.test.ts
// F5c — the AI guide's GitHub knowledge, against a fake GitHub: the sync keeps
// a public repo's start date, README and recent commits; never a private
// repo's (and wipes them if a repo turns private); the public views show only
// public, non-archived, non-client work in the owner's homes; the guide's
// corpus carries it all.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, dbPublic } from "@/lib/db";
import { syncGithub, type FetchLike } from "@/lib/jobs/github-sync";
import { getPublicGithubRepos, getPublicRepoCommits } from "@/lib/queries/github";
import { getGuideCorpus } from "@/lib/guide/corpus";

const RUN = `gk${Date.now().toString(36)}`;
const OWNER = `${RUN}-owner`;
const CLIENT = `${RUN}-client`;
const baseId = (Date.now() % 1_000_000_000) + 500_000_000;
const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const sha = (n: number) => (baseId * 1000 + n).toString(16).padStart(12, "0");

type Repo = Record<string, unknown>;
function repo(n: number, owner: string, name: string, extra: Repo = {}): Repo {
  return {
    id: baseId + n,
    name,
    full_name: `${owner}/${name}`,
    owner: { login: owner },
    description: `${name} does useful things`,
    html_url: `https://github.com/${owner}/${name}`,
    homepage: null,
    private: false,
    fork: false,
    archived: false,
    language: "TypeScript",
    topics: ["ai"],
    stargazers_count: 2,
    pushed_at: recent(1),
    created_at: "2025-02-03T09:00:00Z",
    ...extra,
  };
}

const README = [
  "# Graph Engine [![build](https://img.shields.io/badge/x.svg)](https://ci)",
  "",
  "<p align=center><img src=logo.png></p>",
  "A **fast** graph search engine for [route planning](https://example.com/docs).",
  "",
  "```bash",
  "npm install secret-internal-tool",
  "```",
  "| a | b |",
  "|---|---|",
].join("\n");

function fakeGithub(repos: Repo[], calls: string[]): FetchLike {
  return async (url) => {
    const path = new URL(url).pathname + new URL(url).search;
    calls.push(path);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (path.startsWith("/user/repos")) return json(new URL(url).searchParams.get("page") === "1" ? repos : []);
    if (path.startsWith("/orgs/")) return json({ message: "Not Found" }, 404);
    if (path.startsWith("/users/")) return json([]);
    if (/\/languages$/.test(path)) return json({ TypeScript: 900, Python: 100 });
    if (/\/stats\/commit_activity$/.test(path)) return json([]);
    if (/\/readme$/.test(path)) return json({ encoding: "base64", content: Buffer.from(README).toString("base64") });
    if (/\/commits\?/.test(path)) {
      return json([
        { sha: sha(1), commit: { message: "Add route planner\n\nLong body with details", committer: { date: recent(2) } }, author: { login: OWNER } },
        { sha: sha(2), commit: { message: "Fix edge weights", committer: { date: recent(5) } }, author: null },
        { sha: "not-a-sha", commit: { message: "ignored", committer: { date: recent(1) } } },
      ]);
    }
    return json({ message: `unexpected ${path}` }, 500);
  };
}

const PUBLIC_REPO = `${RUN}-graph-engine`;
const PRIVATE_REPO = `${RUN}-secret-app`;
const CLIENT_REPO = `${RUN}-client-portal`;
const calls: string[] = [];
// "hidden": these repos stay off the site, so the "not written up yet" path is what's tested.
const sync = (repos: Repo[]) => syncGithub({ tokens: ["test-token"], ownedLogins: [OWNER], newRepoVisibility: "hidden", fetch: fakeGithub(repos, calls) });

beforeAll(async () => {
  await db.organization.create({ data: { name: `${RUN} Home`, slug: `${RUN}-home`, githubLogins: [OWNER] } });
  await db.organization.create({ data: { name: `${RUN} Client`, slug: `${RUN}-client-org`, githubLogins: [CLIENT], isClient: true } });
  await sync([repo(1, OWNER, PUBLIC_REPO), repo(2, OWNER, PRIVATE_REPO, { private: true }), repo(3, CLIENT, CLIENT_REPO)]);
});

afterAll(async () => {
  await db.system.updateMany({ where: { githubOwnerLogin: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("the sync keeps a public repo's story", () => {
  it("stores its start date, a clean README excerpt and recent commits", async () => {
    const s = await db.system.findUnique({ where: { githubRepoId: baseId + 1 }, include: { commits: { orderBy: { committedAt: "desc" } } } });
    expect(s!.githubCreatedAt?.toISOString()).toBe("2025-02-03T09:00:00.000Z");
    expect(s!.githubReadmeExcerpt).toContain("A fast graph search engine for route planning.");
    for (const noise of ["![", "<img", "shields.io", "npm install", "|---|", "example.com/docs"]) expect(s!.githubReadmeExcerpt).not.toContain(noise);
    expect(s!.commits.map((c) => c.message)).toEqual(["Add route planner", "Fix edge weights"]); // first lines only; bad sha dropped
  });

  it("never reads a private repo's README or commits", async () => {
    expect(calls.some((c) => c.includes(PRIVATE_REPO) && (c.includes("/readme") || c.includes("/commits")))).toBe(false);
    const s = await db.system.findUnique({ where: { githubRepoId: baseId + 2 }, include: { commits: true } });
    expect(s!.githubReadmeExcerpt).toBeNull();
    expect(s!.commits).toHaveLength(0);
  });

  it("is idempotent — a second run adds no duplicate commits", async () => {
    await sync([repo(1, OWNER, PUBLIC_REPO)]);
    expect(await db.repoCommit.count({ where: { system: { githubRepoId: baseId + 1 } } })).toBe(2);
  });

  it("wipes the kept history when a repo turns private", async () => {
    await sync([repo(1, OWNER, PUBLIC_REPO, { private: true })]);
    const s = await db.system.findUnique({ where: { githubRepoId: baseId + 1 }, include: { commits: true } });
    expect(s!.githubReadmeExcerpt).toBeNull();
    expect(s!.commits).toHaveLength(0);
    await sync([repo(1, OWNER, PUBLIC_REPO)]); // public again for the tests below
  });
});

describe("the public views (BR-1.3/1.4/1.7)", () => {
  it("show the public repo in the owner's home — as not yet written up — with its commits", async () => {
    const repos = await getPublicGithubRepos();
    const graph = repos.find((r) => r.fullName === `${OWNER}/${PUBLIC_REPO}`);
    expect(graph).toMatchObject({ home: `${RUN} Home`, systemPath: null, url: `https://github.com/${OWNER}/${PUBLIC_REPO}`, languages: { TypeScript: 900, Python: 100 } });
    const commits = await getPublicRepoCommits(400);
    expect(commits.filter((c) => c.repo === `${OWNER}/${PUBLIC_REPO}`).map((c) => c.message)).toEqual(["Add route planner", "Fix edge weights"]);
  });

  it("never show a private repo or a client organisation's repo", async () => {
    const names = (await dbPublic.publicGithubRepo.findMany({ where: { fullName: { contains: RUN } } })).map((r) => r.fullName);
    expect(names).toEqual([`${OWNER}/${PUBLIC_REPO}`]);
  });

  it("drop an archived repo", async () => {
    await db.system.update({ where: { githubRepoId: baseId + 1 }, data: { contentStatus: "ARCHIVED" } });
    try {
      expect(await dbPublic.publicGithubRepo.count({ where: { fullName: `${OWNER}/${PUBLIC_REPO}` } })).toBe(0);
    } finally {
      await db.system.update({ where: { githubRepoId: baseId + 1 }, data: { contentStatus: "DRAFT" } });
    }
  });
});

describe("the AI guide's corpus", () => {
  it("knows the repo — its start, languages, README and recent changes — and nothing private", async () => {
    const { text } = await getGuideCorpus(150_000);
    expect(text).toContain(`### ${OWNER}/${PUBLIC_REPO}`);
    expect(text).toContain("Not written up on the site yet.");
    expect(text).toContain("Started: 2025-02-03");
    expect(text).toContain("TypeScript 90%, Python 10%");
    expect(text).toContain("A fast graph search engine");
    expect(text).toContain("Add route planner");
    expect(text).not.toContain(PRIVATE_REPO);
    expect(text).not.toContain(CLIENT_REPO);
  });

  it("shortens READMEs first when the corpus is over budget", async () => {
    const full = await getGuideCorpus(150_000);
    // Just under the full size, so shortening has to kick in.
    const tight = await getGuideCorpus(full.tokens - 1);
    expect(tight.text.length).toBeLessThan(full.text.length);
  });
});

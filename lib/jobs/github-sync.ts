// lib/jobs/github-sync.ts
// The GitHub sync (#95, F4.2): every repo the owner's token can see becomes a
// System — public or private (BR-1.7), owned or collaborated on (BR-1.11) —
// and GitHub's facts about it stay current: full name, owner, privacy, last
// push, languages, topics, stars, and weekly commit activity (approved
// feature 3, "Now building"). For PUBLIC repos it also keeps what the AI guide
// needs to know the work day to day (F5c): when the repo began, the start of
// its README and its recent commits — never for a private repo, and wiped if
// a repo turns private.
//
// What visitors see (BR-1.6, replaced 2026-10-01 at the owner's direction):
//   BR-1.6  a new repo in the owner's own homes is SHOWN by default (status
//           "On GitHub"), per the setting github.sync.newRepoVisibility, and
//           flagged needsCuration so the admin can hide or curate it; anything
//           else lands as a DRAFT
//   BR-1.2  a client organization's system starts REQUIRES_APPROVAL
//   BR-1.11 a collaborated repo gets the "collaborator" relationship, so the
//           database blocks publishing until the repo owner's permission is
//           recorded
//   BR-8.2  curated fields are never overwritten: description, name, stack,
//           live link and relationship are set on create only (or filled when
//           empty); an admin-chosen slug is kept
//   BR-1.14 a repo rename renames the slug only if it was still the derived
//           one, and the old slug keeps redirecting (database)
// A repo whose owner has no Organization mapping is reported in the run
// summary, never guessed. Writes run outside any admin transaction, so the
// audit trail attributes them to SYSTEM.
//
// Runner-agnostic: the job registry (lib/jobs/registry.ts) calls it through
// runJob; `fetch` is injected so tests drive it without the network.

import { Prisma } from "@prisma/client";
import { CONVENTIONAL_WORKSPACES, MANIFEST_PATHS, MAX_WORKSPACES, dependenciesFrom, skillsProvedBy, workspacePatterns, type ManifestFiles } from "@/lib/jobs/manifests";
import { db } from "@/lib/db";
import { isSlugAvailable } from "@/lib/rules/slugs";
import { getSetting } from "@/lib/settings";

const GITHUB_API = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 50; // 5,000 repos per listing — a runaway-pagination backstop
const CONCURRENCY = 4;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type NewRepoVisibility = "public-and-private" | "public-only" | "hidden";

export interface GithubSyncConfig {
  /**
   * One or more read-only tokens. A fine-grained GitHub token covers a single
   * owner (the owner's account, or one organization), so syncing several
   * owners read-only takes one token each; every repo is then read with a
   * token that can see it.
   */
  tokens: string[];
  /** Accounts and organizations the owner owns (GITHUB_SYNC_ORGS). */
  ownedLogins: string[];
  /** Which new repos are shown by default (BR-1.6 — the github.sync.newRepoVisibility setting). */
  newRepoVisibility?: NewRepoVisibility;
  fetch?: FetchLike;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  homepage: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string | null;
  created_at?: string | null;
}

interface GitHubCommit {
  sha: string;
  commit: { message: string; author?: { date?: string } | null; committer?: { date?: string } | null };
  author?: { login?: string } | null;
}

/** Commits kept per repo for the AI guide (the view shows the last 90 days of them). */
const COMMITS_KEPT = 30;
/** README characters kept — the start says what a repo is. */
const README_CHARS = 3000;

interface CommitWeek {
  week: number; // unix seconds, Sunday 00:00 UTC
  days: number[]; // Sunday … Saturday
}

export class GithubRateLimitError extends Error {
  constructor(public resetAt: Date) {
    super(`GitHub API rate limit exceeded; it resets at ${resetAt.toISOString()}.`);
  }
}

export interface GithubSyncSummary {
  [key: string]: Prisma.InputJsonValue;
  reposSeen: number;
  created: number;
  updated: number;
  skippedForks: number;
  unmappedOwners: string[];
  activityPending: string[];
  knowledgeUpdated: number;
  errors: { repo: string; error: string }[];
  /** Accounts whose listing GitHub refused (an organisation's token policy, say); the rest of the run carried on. */
  accountErrors: { account: string; error: string }[];
  /** Live systems whose public repo is gone from GitHub — hidden this run, flagged for the owner. */
  removedFromGithub: string[];
  /** Systems shown this run because the visibility rule now allows them — a repo gone public, or private repos switched on (never curated since). */
  madePublic: string[];
  /** Your own GitHub homes where no token sees a private repo — their private work can't reach the site until a token with access is added. */
  noPrivateAccess: string[];
  /** Systems whose repo stopped answering publicly where the token can't see private repos — kept, now shown as private (BR-1.7). */
  madePrivate: string[];
  /** Skill evidence from manifests: links added and removed this run (WP-103). */
  skillLinks: { added: number; removed: number };
}

/**
 * A repo's homepage, if it is a live site: an http(s) address that isn't
 * GitHub itself — a homepage pointing back at a repo would make "View it live"
 * open source code.
 */
export function liveSite(homepage: string | null): string | null {
  const url = homepage?.trim();
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
    if (hostname === "github.com" || hostname.endsWith(".github.com")) return null;
    return url;
  } catch {
    return null;
  }
}

/** GitHub's own reason for a failed call, from its JSON body — it names the policy or permission at fault. */
async function githubError(path: string, res: Response): Promise<Error> {
  let reason = "";
  try {
    const body = (await res.json()) as { message?: unknown };
    if (typeof body?.message === "string") reason = body.message.slice(0, 200);
  } catch {
    // no JSON body — the status says it all
  }
  return new Error(`GitHub ${path}: ${res.status} ${res.statusText}${reason ? ` — ${reason}` : ""}`.trim());
}

export class GithubClient {
  constructor(
    private token: string,
    private fetchImpl: FetchLike,
  ) {}

  async request(path: string, accept = "application/vnd.github+json"): Promise<Response> {
    const res = await this.fetchImpl(`${GITHUB_API}${path}`, {
      headers: {
        // No token = an anonymous client: public data only (the fallback below).
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        Accept: accept,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      throw new GithubRateLimitError(Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : new Date(Date.now() + 3600_000));
    }
    return res;
  }

  async json<T>(path: string): Promise<T> {
    const res = await this.request(path);
    if (!res.ok) throw await githubError(path, res);
    return (await res.json()) as T;
  }

  /** Every page of a repo listing; null if the listing doesn't exist (404). */
  async listRepos(path: string): Promise<GitHubRepo[] | null> {
    const repos: GitHubRepo[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const res = await this.request(`${path}${sep}per_page=${PER_PAGE}&page=${page}`);
      if (res.status === 404) return page === 1 ? null : repos;
      if (!res.ok) throw await githubError(path, res);
      const batch = (await res.json()) as GitHubRepo[];
      repos.push(...batch);
      if (batch.length < PER_PAGE) break;
    }
    return repos;
  }
}

/**
 * A readable name suggested from a repository name (F5c): "graph-search-engine"
 * → "Graph Search Engine", "machine_learning_project" → "Machine Learning
 * Project". An all-caps name (an account, an acronym) is kept as it is. Only a
 * suggestion — the admin curates the name, and a curated one is never touched.
 */
export function displayNameFromRepo(repoName: string): string {
  if (repoName === repoName.toUpperCase()) return repoName;
  const words = repoName.split(/[-_\s]+/).filter(Boolean);
  if (words.length === 0) return repoName;
  return words.map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "") || "repo";
}

/** A free slug for this system: the base, else base-2, base-3 … (BR-1.14 reserved slugs skipped). */
async function resolveSlug(base: string, systemId: string | null): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (await isSlugAvailable(db, candidate, systemId)) return candidate;
  }
}

/**
 * A README as plain prose for the AI guide: badges, images, HTML, code blocks
 * and link targets removed, headings and emphasis flattened, whitespace
 * collapsed, cut at a word boundary.
 */
export function readmeToText(markdown: string, max = README_CHARS): string {
  const text = markdown
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, " ") // linked badges
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/[*_`~]{1,3}([^*_`~\n]+)[*_`~]{1,3}/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, " ") // tables
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n(\s*\n)+/g, "\n\n")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).trimEnd()}…`;
}

/**
 * A public repo's README and recent commits (F5c, the AI guide). Best-effort:
 * a missing README (404) or an empty repo (409) simply leaves nothing.
 */
/**
 * The repo's dependency names, from its own manifests (spec WP-103). Best-effort:
 * a missing file (404) or an empty repo (409) just contributes nothing; anything
 * else unexpected leaves the last known list in place rather than erasing it.
 */
async function saveDependencies(gh: GithubClient, repo: GitHubRepo, systemId: string) {
  const raw = (p: string) => gh.request(`/repos/${repo.full_name}/contents/${p}`, "application/vnd.github.raw+json");
  // A folder's manifests; null when GitHub answers something unexpected.
  const read = async (dir: string): Promise<ManifestFiles | null> => {
    const files: ManifestFiles = {};
    for (const path of MANIFEST_PATHS) {
      const res = await raw(dir ? `${dir}/${path}` : path);
      if (res.status === 404 || res.status === 409) continue;
      if (!res.ok) return null;
      files[path] = (await res.text()).slice(0, 200_000);
    }
    return files;
  };
  const files = await read("");
  if (!files) return; // unknown state — keep what we had
  // A monorepo's real dependencies live in its workspaces: the ones its root
  // package.json declares, else the conventional apps/*, packages/*, services/*.
  const declared = files["package.json"] ? workspacePatterns(files["package.json"]) : [];
  const workspaces: ManifestFiles[] = [];
  for (const pattern of declared.length > 0 ? declared : CONVENTIONAL_WORKSPACES) {
    if (workspaces.length >= MAX_WORKSPACES) break;
    let dirs = [pattern];
    if (pattern.endsWith("/*")) {
      const listing = await gh.request(`/repos/${repo.full_name}/contents/${pattern.slice(0, -2)}`);
      if (!listing.ok) continue;
      const entries = (await listing.json()) as { type?: string; path?: string }[];
      dirs = Array.isArray(entries) ? entries.filter((e) => e.type === "dir" && typeof e.path === "string").map((e) => e.path!) : [];
    }
    for (const dir of dirs.slice(0, MAX_WORKSPACES - workspaces.length)) {
      const ws = await read(dir);
      if (ws && Object.keys(ws).length > 0) workspaces.push(ws);
    }
  }
  await db.system.update({ where: { id: systemId }, data: { githubDependencies: dependenciesFrom(files, workspaces) } });
}

async function saveRepoKnowledge(gh: GithubClient, repo: GitHubRepo, systemId: string) {
  const readmeRes = await gh.request(`/repos/${repo.full_name}/readme`);
  let readme: string | null = null;
  if (readmeRes.ok) {
    const body = (await readmeRes.json()) as { content?: string; encoding?: string };
    if (body.content && body.encoding === "base64") readme = readmeToText(Buffer.from(body.content, "base64").toString("utf8")) || null;
  }
  await db.system.update({ where: { id: systemId }, data: { githubReadmeExcerpt: readme } });

  const commitsRes = await gh.request(`/repos/${repo.full_name}/commits?per_page=${COMMITS_KEPT}`);
  if (!commitsRes.ok) return;
  const commits = ((await commitsRes.json()) as GitHubCommit[]).filter((c) => /^[0-9a-f]{7,64}$/.test(c.sha));
  const rows = commits
    .map((c) => ({
      systemId,
      sha: c.sha,
      message: (c.commit.message.split("\n")[0] ?? "").trim().slice(0, 500),
      committedAt: new Date(c.commit.committer?.date ?? c.commit.author?.date ?? Date.now()),
      authorLogin: c.author?.login ?? null,
    }))
    .filter((r) => r.message.length > 0 && !Number.isNaN(r.committedAt.getTime()));
  if (rows.length) await db.repoCommit.createMany({ data: rows, skipDuplicates: true });
  // Keep only the newest COMMITS_KEPT per repo.
  const keep = await db.repoCommit.findMany({ where: { systemId }, orderBy: { committedAt: "desc" }, take: COMMITS_KEPT, select: { id: true } });
  await db.repoCommit.deleteMany({ where: { systemId, id: { notIn: keep.map((k) => k.id) } } });
}

/** The Monday (UTC, date only) of the ISO week containing `date`. */
function isoMonday(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0 … Sunday = 6
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** GitHub's Sunday-to-Saturday weeks re-bucketed by day into ISO (Monday) weeks. */
export function toIsoWeeks(weeks: CommitWeek[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of weeks) {
    w.days.forEach((commits, i) => {
      const monday = isoMonday(new Date((w.week + i * 86400) * 1000));
      out.set(monday, (out.get(monday) ?? 0) + Math.max(0, commits || 0));
    });
  }
  return out;
}

async function saveActivity(systemId: string, weeks: Map<string, number>) {
  if (weeks.size === 0) return;
  const starts = [...weeks.keys()];
  const commits = starts.map((s) => weeks.get(s)!);
  await db.$executeRaw`
    INSERT INTO "SystemActivityWeek" ("systemId", "weekStart", "commits", "updatedAt")
    SELECT ${systemId}, w.start::date, w.commits, now()
      FROM unnest(${starts}::text[], ${commits}::int[]) AS w(start, commits)
    ON CONFLICT ("systemId", "weekStart") DO UPDATE SET "commits" = EXCLUDED."commits", "updatedAt" = now()
    WHERE "SystemActivityWeek"."commits" IS DISTINCT FROM EXCLUDED."commits"`;
}

async function mapConcurrent<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

export async function syncGithub(config: GithubSyncConfig): Promise<GithubSyncSummary> {
  const clients = config.tokens.map((t) => new GithubClient(t, config.fetch ?? fetch));
  const visibility = config.newRepoVisibility ?? "public-only";
  const owned = new Set(config.ownedLogins.map((l) => l.toLowerCase()));

  // Discover: everything each token can reach (owned, collaborator, org
  // member, private included), plus each configured account's own listing,
  // deduplicated. Each repo remembers a token that can read it.
  const found = new Map<number, GitHubRepo>();
  const clientFor = new Map<number, GithubClient>();
  const add = (repos: GitHubRepo[] | null, client: GithubClient) => {
    for (const r of repos ?? []) {
      found.set(r.id, r);
      if (!clientFor.has(r.id) || r.private) clientFor.set(r.id, client);
    }
  };
  // One account refusing a token (an organisation's token policy, say) is recorded
  // and skipped, not fatal: the other accounts still sync. A rate limit, or the
  // token's own listing failing (a revoked token), still stops the run.
  const accountErrors = new Map<string, string>();
  // An owned account that refuses the token (e.g. an organisation's policy against
  // long-lived classic tokens) still has public repos anyone can read: those are listed
  // and read anonymously — public data only — so its public work still reaches the site.
  const anonymous = new GithubClient("", config.fetch ?? fetch);
  const anonymouslyListed = new Set<string>();
  for (const client of clients) {
    add(await client.listRepos("/user/repos?affiliation=owner,collaborator,organization_member&visibility=all"), client);
    for (const login of config.ownedLogins) {
      try {
        add(
          (await client.listRepos(`/orgs/${encodeURIComponent(login)}/repos?type=all`)) ??
            (await client.listRepos(`/users/${encodeURIComponent(login)}/repos?type=owner`)),
          client,
        );
      } catch (err) {
        if (err instanceof GithubRateLimitError) throw err;
        accountErrors.set(login, err instanceof Error ? err.message.slice(0, 300) : String(err));
        if (!anonymouslyListed.has(login.toLowerCase())) {
          anonymouslyListed.add(login.toLowerCase());
          try {
            const pub = await anonymous.listRepos(`/users/${encodeURIComponent(login)}/repos?type=owner`);
            // The token is refused for this account, so its public repos are read anonymously.
            for (const r of (pub ?? []).filter((x) => !x.private)) {
              found.set(r.id, r);
              clientFor.set(r.id, anonymous);
            }
          } catch (anonErr) {
            if (anonErr instanceof GithubRateLimitError) throw anonErr;
            // Nothing public to add; the account error above already says why.
          }
        }
      }
    }
  }

  const [defaultStatus, relationships, organizations] = await Promise.all([
    // An uncurated repo's honest status; "planned" only if the lookup value is missing.
    db.status.findUnique({ where: { key: "on_github" } }).then((s) => s ?? db.status.findUniqueOrThrow({ where: { key: "planned" } })),
    db.repoRelationship.findMany({ where: { key: { in: ["owner", "collaborator"] }, active: true } }),
    db.organization.findMany({ select: { id: true, slug: true, isClient: true, githubLogins: true } }),
  ]);
  const relationshipId = (key: string) => relationships.find((r) => r.key === key)?.id ?? null;
  const orgFor = (login: string) =>
    organizations.find((o) => o.githubLogins.some((l) => l.toLowerCase() === login.toLowerCase())) ??
    organizations.find((o) => o.slug === slugify(login));

  const summary: GithubSyncSummary = {
    reposSeen: found.size,
    created: 0,
    updated: 0,
    skippedForks: 0,
    unmappedOwners: [],
    activityPending: [],
    knowledgeUpdated: 0,
    errors: [],
    accountErrors: [...accountErrors].map(([account, error]) => ({ account, error })),
    removedFromGithub: [],
    madePublic: [],
    madePrivate: [],
    noPrivateAccess: [],
    skillLinks: { added: 0, removed: 0 },
  };
  const unmapped = new Set<string>();

  const repos = [...found.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
  await mapConcurrent(repos, CONCURRENCY, async (repo) => {
    if (repo.fork) {
      summary.skippedForks++;
      return; // someone else's work, copied
    }
    const gh = clientFor.get(repo.id)!;
    const organization = orgFor(repo.owner.login);
    if (!organization) {
      unmapped.add(repo.owner.login);
      return;
    }

    try {
      const languages = await gh.json<Record<string, number>>(`/repos/${repo.full_name}/languages`).catch((err) => {
        if (err instanceof GithubRateLimitError) throw err;
        return null; // metadata is best-effort; the repo itself still syncs
      });
      const facts = {
        githubRepoId: repo.id,
        githubFullName: repo.full_name,
        githubOwnerLogin: repo.owner.login,
        repoPrivate: repo.private, // BR-1.7 — the public view never links a private repo
        githubPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        githubCreatedAt: repo.created_at ? new Date(repo.created_at) : null,
        githubLanguages: languages ?? undefined,
        githubTopics: repo.topics ?? [],
        githubStars: Math.max(0, repo.stargazers_count ?? 0),
        githubSyncedAt: new Date(),
        // Seen on GitHub this run — not gone (it may have come back).
        githubGoneAt: null,
        repoUrl: repo.html_url,
      };
      const relationship = owned.has(repo.owner.login.toLowerCase()) ? "owner" : "collaborator";

      const existing =
        (await db.system.findUnique({ where: { githubRepoId: repo.id } })) ??
        // A system curated by hand before the sync knew it: attach by name.
        (await db.system.findFirst({ where: { githubRepoId: null, githubFullName: repo.full_name } })) ??
        (await db.system.findFirst({ where: { githubRepoId: null, githubFullName: null, slug: slugify(repo.name) } }));

      let systemId: string;
      if (existing) {
        // BR-1.14 — follow a repo rename only if the slug is still the one derived from the old name.
        const oldName = existing.githubFullName?.split("/")[1];
        const renamed = oldName !== undefined && oldName !== repo.name && existing.slug.startsWith(slugify(oldName));
        // BR-1.6 applied again every run (owner, 2026-10-02 and 2026-10-08): a system that is
        // hidden but never curated — created hidden because its repo was private, say — is
        // shown as soon as the same rule a new repo gets allows it: the repo went public, or
        // private repos were switched on (github.sync.newRepoVisibility). An owner's choice to
        // hide it (needsCuration off) is never undone, and a repo gone from GitHub isn't here.
        const turnedPublic =
          existing.needsCuration && existing.contentStatus === "DRAFT" && existing.githubGoneAt === null && showByDefault(visibility, repo.private, organization.isClient, relationship);
        await db.system.update({
          where: { id: existing.id },
          data: {
            ...facts,
            ...(renamed && { slug: await resolveSlug(slugify(repo.name), existing.id) }),
            // BR-8.2 — fill, never overwrite, what the admin curates. A name
            // still equal to the raw repo name was never curated.
            ...(existing.name === repo.name && { name: displayNameFromRepo(repo.name) }),
            ...(existing.liveUrl === null && liveSite(repo.homepage) && { liveUrl: liveSite(repo.homepage) }),
            ...(existing.repoRelationshipId === null && { repoRelationshipId: relationshipId(relationship) }),
            ...(turnedPublic && { contentStatus: "PUBLISHED" as const }),
            // Uncurated words follow GitHub's own description until a write-up (BR-4.5) or the owner
            // (BR-8.2) has written them — never over either.
            ...(existing.needsCuration && existing.writeupGeneratedAt === null && repo.description?.trim() && { description: repo.description.trim() }),
          },
        });
        if (turnedPublic) summary.madePublic.push(existing.slug);
        systemId = existing.id;
        summary.updated++;
      } else {
        try {
          const created = await db.system.create({
            data: {
              ...facts,
              name: displayNameFromRepo(repo.name),
              slug: await resolveSlug(slugify(repo.name), null),
              description: repo.description?.trim() || repo.name,
              liveUrl: liveSite(repo.homepage),
              techStack: repo.language ? [repo.language] : [],
              organizationId: organization.id,
              statusId: defaultStatus.id,
              repoRelationshipId: relationshipId(relationship),
              // BR-1.2 — client organizations start restricted.
              clientVisibility: organization.isClient ? "REQUIRES_APPROVAL" : "PUBLIC",
              // BR-1.6 — the owner's own repos are shown by default (the setting decides
              // which); client and collaborated work stays hidden until approved.
              // BR-1.6 — nothing is ever auto-published.
              contentStatus: showByDefault(visibility, repo.private, organization.isClient, relationship) ? "PUBLISHED" : "DRAFT",
              needsCuration: true,
            },
          });
          systemId = created.id;
          summary.created++;
        } catch (err) {
          // Two runs (or a run and an admin) racing on the same repo or slug.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
          throw err;
        }
      }

      // Weekly activity: GitHub answers 202 while it computes the stats — try next run.
      const stats = await gh.request(`/repos/${repo.full_name}/stats/commit_activity`);
      if (stats.status === 202) summary.activityPending.push(repo.full_name);
      else if (stats.ok && stats.status !== 204) {
        const weeks = (await stats.json()) as CommitWeek[];
        if (Array.isArray(weeks)) await saveActivity(systemId, toIsoWeeks(weeks));
      }

      // The AI guide's knowledge — public repos only; a repo that turned private loses what was kept.
      if (repo.private) {
        await db.repoCommit.deleteMany({ where: { systemId } });
        await db.system.update({ where: { id: systemId }, data: { githubReadmeExcerpt: null, githubDependencies: [] } });
      } else {
        await saveRepoKnowledge(gh, repo, systemId);
        await saveDependencies(gh, repo, systemId);
        summary.knowledgeUpdated++;
      }
    } catch (err) {
      if (err instanceof GithubRateLimitError) throw err; // the whole run stops; the next one resumes
      summary.errors.push({ repo: repo.full_name, error: err instanceof Error ? err.message.slice(0, 300) : String(err) });
    }
  });

  // A live system whose public repo in the owner's own homes has gone from
  // GitHub (deleted, or no longer the owner's) leaves the site: hidden as a
  // draft and flagged for the owner — never deleted (BR-1.9), never guessed.
  // Only when that account was listed in full this run, and only on GitHub's
  // own "not found" for the repo. GitHub answers "not found" for a private repo
  // the token can't see too, so that answer only means "deleted" in an account
  // where the token sees private repos this run. Elsewhere it means "no longer
  // public": the system stays, shown as private (BR-1.7), its public knowledge
  // wiped and flagged for the owner (FundsLink and Governova were hidden as
  // "gone" on 2026-10-08 when they went private — D-021).
  const listedAccounts = config.ownedLogins.map((l) => l.toLowerCase()).filter((l) => !accountErrors.has(l) && ![...accountErrors.keys()].some((k) => k.toLowerCase() === l));
  // Every public repo counts — written up or not: one that was never written up is still
  // listed among "every public repo" (PublicGithubRepo) until it's marked gone.
  const gone = await db.system.findMany({
    where: {
      githubRepoId: { not: null, notIn: [...found.keys()] },
      githubFullName: { not: null },
      repoPrivate: false,
      githubGoneAt: null,
    },
    select: { id: true, slug: true, githubFullName: true, githubOwnerLogin: true, contentStatus: true },
  });
  const seesPrivate = new Set([...found.values()].filter((r) => r.private).map((r) => r.owner.login.toLowerCase()));
  summary.noPrivateAccess = config.ownedLogins.filter((l) => !seesPrivate.has(l.toLowerCase()));
  for (const s of gone) {
    if (!s.githubOwnerLogin || !listedAccounts.includes(s.githubOwnerLogin.toLowerCase())) continue;
    const res = await clients[0]!.request(`/repos/${s.githubFullName}`);
    if (res.status !== 404) continue;
    if (!seesPrivate.has(s.githubOwnerLogin.toLowerCase())) {
      await db.repoCommit.deleteMany({ where: { systemId: s.id } });
      await db.system.update({ where: { id: s.id }, data: { repoPrivate: true, needsCuration: true, githubReadmeExcerpt: null, githubDependencies: [] } });
      summary.madePrivate.push(s.slug);
      continue;
    }
    await db.system.update({
      where: { id: s.id },
      data: { githubGoneAt: new Date(), ...(s.contentStatus === "PUBLISHED" && { contentStatus: "DRAFT", publishAt: null, needsCuration: true }) },
    });
    summary.removedFromGithub.push(s.slug);
  }

  // Skill evidence from manifests (WP-103): link each skill to the systems whose
  // dependencies include one of its aliases; drop manifest links whose
  // dependency is gone. The owner's own links are never added to or removed.
  const [skills, systemsWithDeps, manifestLinks] = await Promise.all([
    db.skill.findMany({ where: { aliases: { isEmpty: false } }, select: { id: true, aliases: true } }),
    db.system.findMany({ where: { repoPrivate: false, githubGoneAt: null }, select: { id: true, githubDependencies: true } }),
    db.skillOnSystem.findMany({ where: { source: "manifest" }, select: { skillId: true, systemId: true } }),
  ]);
  const wanted = new Set(systemsWithDeps.flatMap((sys) => skillsProvedBy(sys.githubDependencies, skills).map((skillId) => `${skillId}|${sys.id}`)));
  const stale = manifestLinks.filter((l) => !wanted.has(`${l.skillId}|${l.systemId}`));
  if (stale.length) {
    await db.skillOnSystem.deleteMany({ where: { source: "manifest", OR: stale.map((l) => ({ skillId: l.skillId, systemId: l.systemId })) } });
  }
  const added = await db.skillOnSystem.createMany({
    data: [...wanted].map((key) => {
      const [skillId, systemId] = key.split("|") as [string, string];
      return { skillId, systemId, source: "manifest" };
    }),
    skipDuplicates: true, // an owner's link for the same pair stays the owner's
  });
  summary.skillLinks = { added: added.count, removed: stale.length };

  summary.unmappedOwners = [...unmapped].sort();
  summary.activityPending.sort();
  return summary;
}

/** BR-1.6: whether a newly synced repo is shown by default. */
export function showByDefault(visibility: NewRepoVisibility, isPrivate: boolean, isClient: boolean, relationship: string): boolean {
  if (isClient || relationship !== "owner") return false; // BR-1.2 / BR-1.11: needs approval first
  if (visibility === "hidden") return false;
  return visibility === "public-and-private" || !isPrivate;
}

/** The job: configuration from the environment; a missing piece fails the run with the reason. */
export async function runGithubSync(fetchImpl?: FetchLike): Promise<GithubSyncSummary> {
  // Comma-separated: one read-only token per GitHub owner (docs/DEPLOYMENT.md).
  const tokens = (process.env.GITHUB_SYNC_TOKEN ?? "").split(/[\s,]+/).filter(Boolean);
  const ownedLogins = (process.env.GITHUB_SYNC_ORGS ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error("GITHUB_SYNC_TOKEN is not set — add read-only GitHub token(s) to the environment (docs/DEPLOYMENT.md).");
  if (ownedLogins.length === 0) throw new Error("GITHUB_SYNC_ORGS is not set — list the owner's GitHub accounts and organizations.");
  const newRepoVisibility = await getSetting("github.sync.newRepoVisibility");
  return syncGithub({ tokens, ownedLogins, newRepoVisibility, fetch: fetchImpl });
}

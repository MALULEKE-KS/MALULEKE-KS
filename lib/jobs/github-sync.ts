// lib/jobs/github-sync.ts
// The GitHub sync (#95, F4.2): every repo the owner's token can see becomes a
// System — public or private (BR-1.7), owned or collaborated on (BR-1.11) —
// and GitHub's facts about it stay current: full name, owner, privacy, last
// push, languages, topics, stars, and weekly commit activity (approved
// feature 3, "Now building").
//
// It never decides what visitors see:
//   BR-1.6  a new system lands as a DRAFT flagged needsCuration
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
import { db } from "@/lib/db";
import { isSlugAvailable } from "@/lib/rules/slugs";

const GITHUB_API = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 50; // 5,000 repos per listing — a runaway-pagination backstop
const CONCURRENCY = 4;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

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
}

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
  errors: { repo: string; error: string }[];
}

class GithubClient {
  constructor(
    private token: string,
    private fetchImpl: FetchLike,
  ) {}

  async request(path: string): Promise<Response> {
    const res = await this.fetchImpl(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
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
    if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${res.statusText}`.trim());
    return (await res.json()) as T;
  }

  /** Every page of a repo listing; null if the listing doesn't exist (404). */
  async listRepos(path: string): Promise<GitHubRepo[] | null> {
    const repos: GitHubRepo[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const res = await this.request(`${path}${sep}per_page=${PER_PAGE}&page=${page}`);
      if (res.status === 404) return page === 1 ? null : repos;
      if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${res.statusText}`.trim());
      const batch = (await res.json()) as GitHubRepo[];
      repos.push(...batch);
      if (batch.length < PER_PAGE) break;
    }
    return repos;
  }
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
  for (const client of clients) {
    add(await client.listRepos("/user/repos?affiliation=owner,collaborator,organization_member&visibility=all"), client);
    for (const login of config.ownedLogins) {
      add(
        (await client.listRepos(`/orgs/${encodeURIComponent(login)}/repos?type=all`)) ??
          (await client.listRepos(`/users/${encodeURIComponent(login)}/repos?type=owner`)),
        client,
      );
    }
  }

  const [defaultStatus, relationships, organizations] = await Promise.all([
    db.status.findUniqueOrThrow({ where: { key: "planned" } }),
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
    errors: [],
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
        githubLanguages: languages ?? undefined,
        githubTopics: repo.topics ?? [],
        githubStars: Math.max(0, repo.stargazers_count ?? 0),
        githubSyncedAt: new Date(),
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
        await db.system.update({
          where: { id: existing.id },
          data: {
            ...facts,
            ...(renamed && { slug: await resolveSlug(slugify(repo.name), existing.id) }),
            // BR-8.2 — fill, never overwrite, what the admin curates.
            ...(existing.liveUrl === null && repo.homepage && { liveUrl: repo.homepage }),
            ...(existing.repoRelationshipId === null && { repoRelationshipId: relationshipId(relationship) }),
          },
        });
        systemId = existing.id;
        summary.updated++;
      } else {
        try {
          const created = await db.system.create({
            data: {
              ...facts,
              name: repo.name,
              slug: await resolveSlug(slugify(repo.name), null),
              description: repo.description?.trim() || repo.name,
              liveUrl: repo.homepage || null,
              techStack: repo.language ? [repo.language] : [],
              organizationId: organization.id,
              statusId: defaultStatus.id,
              repoRelationshipId: relationshipId(relationship),
              // BR-1.2 — client organizations start restricted.
              clientVisibility: organization.isClient ? "REQUIRES_APPROVAL" : "PUBLIC",
              // BR-1.6 — nothing is ever auto-published.
              contentStatus: "DRAFT",
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
    } catch (err) {
      if (err instanceof GithubRateLimitError) throw err; // the whole run stops; the next one resumes
      summary.errors.push({ repo: repo.full_name, error: err instanceof Error ? err.message.slice(0, 300) : String(err) });
    }
  });

  summary.unmappedOwners = [...unmapped].sort();
  summary.activityPending.sort();
  return summary;
}

/** The job: configuration from the environment; a missing piece fails the run with the reason. */
export async function runGithubSync(fetchImpl?: FetchLike): Promise<GithubSyncSummary> {
  // Comma-separated: one read-only token per GitHub owner (docs/DEPLOYMENT.md).
  const tokens = (process.env.GITHUB_SYNC_TOKEN ?? "").split(/[\s,]+/).filter(Boolean);
  const ownedLogins = (process.env.GITHUB_SYNC_ORGS ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  if (tokens.length === 0) throw new Error("GITHUB_SYNC_TOKEN is not set — add read-only GitHub token(s) to the environment (docs/DEPLOYMENT.md).");
  if (ownedLogins.length === 0) throw new Error("GITHUB_SYNC_ORGS is not set — list the owner's GitHub accounts and organizations.");
  return syncGithub({ tokens, ownedLogins, fetch: fetchImpl });
}

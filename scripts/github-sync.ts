// scripts/github-sync.ts
//
// Core sync logic only — deliberately runner-agnostic (Ports & Adapters,
// per EXT-1 code-level practice). This function doesn't know or care whether
// it's invoked by a Vercel Cron route, a BullMQ worker, or a GitHub Actions
// scheduled workflow. Wire exactly one adapter to it; swapping later costs
// nothing here.
//
// Enforces at write time:
//   BR-1.2 — clientVisibility defaults to REQUIRES_APPROVAL for client orgs
//   BR-1.6 — every synced system starts contentStatus=DRAFT, needsCuration=true
//   BR-1.7 — private repos are skipped here for now. The rule was rewritten
//            (2026-09-19): private repos are synced as drafts and shown as
//            private publicly. This job adopts that in F4, with the metadata
//            fields (#70) and JobRun locking.
//   BR-8.2 — never touches an existing curated row's status/description
//
// A concurrent run (scheduled + manual overlap) is expected, not prevented —
// duplicate-key create failures on `slug` or `githubRepoId` are caught and
// counted as a skip rather than crashing the whole run.

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const GITHUB_API = "https://api.github.com";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  private: boolean;
  language: string | null;
  archived: boolean;
  fork: boolean;
}

class GithubRateLimitError extends Error {
  constructor(public resetAt: Date) {
    super(`GitHub API rate limit exceeded, resets at ${resetAt.toISOString()}`);
  }
}

async function githubFetch(url: string, token: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    const resetHeader = res.headers.get("x-ratelimit-reset");
    const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : new Date(Date.now() + 60 * 60 * 1000);
    throw new GithubRateLimitError(resetAt);
  }

  return res;
}

async function fetchOrgRepos(org: string, token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await githubFetch(`${GITHUB_API}/orgs/${org}/repos?per_page=100&page=${page}`, token);

    // A personal account (like MALULEKE-KS itself) uses /users/, not /orgs/ —
    // fall back automatically rather than requiring two separate call sites.
    if (res.status === 404) {
      return fetchUserRepos(org, token);
    }

    if (!res.ok) {
      throw new Error(`GitHub API error for ${org}: ${res.status} ${res.statusText}`);
    }

    const batch: GitHubRepo[] = await res.json();
    if (batch.length === 0) break;
    repos.push(...batch);
    page += 1;
  }

  return repos;
}

async function fetchUserRepos(user: string, token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await githubFetch(`${GITHUB_API}/users/${user}/repos?per_page=100&page=${page}`, token);

    if (!res.ok) {
      throw new Error(`GitHub API error for ${user}: ${res.status} ${res.statusText}`);
    }

    const batch: GitHubRepo[] = await res.json();
    if (batch.length === 0) break;
    repos.push(...batch);
    page += 1;
  }

  return repos;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findOrganizationForLogin(login: string) {
  // Explicit mapping first (handles logins that don't slugify to their
  // Organization's own slug, e.g. "MALULEKE-KS" -> "personal"), then fall
  // back to slug equality for the common case.
  const byLogin = await prisma.organization.findFirst({
    where: { githubLogins: { has: login } },
  });
  if (byLogin) return byLogin;

  return prisma.organization.findUnique({ where: { slug: slugify(login) } });
}

export async function syncGithubProjects(): Promise<{
  created: number;
  updatedExisting: number;
  skippedPrivate: number;
  skippedConflict: number;
  orgsSynced: string[];
}> {
  const token = process.env.GITHUB_SYNC_TOKEN;
  const orgsEnv = process.env.GITHUB_SYNC_ORGS ?? "";
  const orgs = orgsEnv.split(",").map((o) => o.trim()).filter(Boolean);

  if (!token) throw new Error("GITHUB_SYNC_TOKEN is not set");
  if (orgs.length === 0) throw new Error("GITHUB_SYNC_ORGS is not set");

  const defaultStatus = await prisma.status.findUniqueOrThrow({
    where: { key: "planned" },
  });

  let created = 0;
  let updatedExisting = 0;
  let skippedPrivate = 0;
  let skippedConflict = 0;

  for (const org of orgs) {
    const organization = await findOrganizationForLogin(org);

    if (!organization) {
      // A GitHub org/user with no matching Organization row is a config gap,
      // not a silent skip — surface it rather than losing repos quietly.
      console.warn(
        `No Organization record for GitHub login "${org}" (checked githubLogins and slug "${slugify(org)}"). Skipping.`
      );
      continue;
    }

    const repos = await fetchOrgRepos(org, token);

    for (const repo of repos) {
      if (repo.fork || repo.archived) continue; // not a signal worth curating

      if (repo.private) {
        // BR-1.7 — private/internal repos are never auto-synced, regardless
        // of what the PAT can see. Confidential work is added deliberately,
        // via POST /admin/systems.
        skippedPrivate += 1;
        continue;
      }

      // Match by stable GitHub repo id first — survives a repo rename that
      // would otherwise slugify to a different value and create a duplicate.
      const existingById = await prisma.system.findUnique({
        where: { githubRepoId: repo.id },
      });

      if (existingById) {
        // BR-8.2 in spirit: never overwrite curated fields on an existing row.
        // Only repoUrl/liveUrl/slug are safe to refresh — they're sourced
        // facts, not curated content. Slug is re-derived so a rename is
        // reflected in the URL too.
        await prisma.system.update({
          where: { id: existingById.id },
          data: {
            slug: await resolveSlug(slugify(repo.name), existingById.id),
            repoUrl: repo.html_url,
            liveUrl: repo.homepage || existingById.liveUrl,
          },
        });
        updatedExisting += 1;
        continue;
      }

      // No githubRepoId match — could be a genuinely new repo, or a
      // pre-existing manually-curated System (created before this field
      // existed, or added by hand) that happens to share the derived slug.
      // In the latter case, attach the id rather than creating a duplicate.
      const slug = await resolveSlug(slugify(repo.name), null);
      const existingBySlug = await prisma.system.findUnique({ where: { slug } });

      if (existingBySlug && existingBySlug.githubRepoId === null) {
        await prisma.system.update({
          where: { id: existingBySlug.id },
          data: {
            githubRepoId: repo.id,
            repoUrl: repo.html_url,
            liveUrl: repo.homepage || existingBySlug.liveUrl,
          },
        });
        updatedExisting += 1;
        continue;
      }

      try {
        await prisma.system.create({
          data: {
            name: repo.name,
            slug,
            githubRepoId: repo.id,
            organizationId: organization.id,
            statusId: defaultStatus.id,
            description: repo.description ?? "",
            repoUrl: repo.html_url,
            liveUrl: repo.homepage,
            techStack: repo.language ? [repo.language] : [],
            // BR-1.2 — client orgs default to REQUIRES_APPROVAL, never PUBLIC
            clientVisibility: organization.isClient ? "REQUIRES_APPROVAL" : "PUBLIC",
            // BR-1.6 — sync-created rows are always draft, always flagged
            contentStatus: "DRAFT",
            needsCuration: true,
          },
        });
        created += 1;
      } catch (err) {
        // A concurrent run (or a race against a manual admin create) can hit
        // the unique constraint on slug/githubRepoId between our read and
        // write above — that's an expected race, not a fatal error.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          skippedConflict += 1;
          continue;
        }
        throw err;
      }
    }
  }

  return { created, updatedExisting, skippedPrivate, skippedConflict, orgsSynced: orgs };
}

// Two different repos across orgs can slugify to the same string (e.g. "api"
// under both KSDRILL-SA and GrowthCore-Solutions). On collision, disambiguate
// by appending a short numeric suffix rather than failing the sync.
async function resolveSlug(baseSlug: string, currentSystemId: string | null): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.system.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === currentSystemId) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

// Allows `npx tsx scripts/github-sync.ts` for a manual run during development,
// separate from whatever scheduler adapter runs it in production.
if (require.main === module) {
  syncGithubProjects()
    .then((result) => {
      console.log("Sync complete:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Sync failed:", err);
      process.exit(1);
    });
}

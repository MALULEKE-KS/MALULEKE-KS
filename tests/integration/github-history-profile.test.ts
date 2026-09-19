// tests/integration/github-history-profile.test.ts
// F1.6b (#69, #70): repo ownership and the owner's permission (BR-1.11),
// private repos (BR-1.7), status history, auto-drafted journey milestones
// (BR-1.12), GitHub activity, skill evidence, the profile, and job runs.
// Most writes go straight through Prisma, proving the DATABASE refuses each
// violation; each refusal is paired with a write that must still succeed.
//
// Systems here that move into a SHIPPED status are ARCHIVED from the start, so
// they never touch the homepage counts control-plane.test.ts asserts exactly.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import { POST as createLookup } from "@/app/api/v1/lookups/[type]/route";
import { PATCH as patchLookup } from "@/app/api/v1/lookups/[type]/[id]/route";
import { GET as publicTimeline } from "@/app/api/v1/timeline/route";
import { PATCH as patchTimeline } from "@/app/api/v1/admin/timeline/[id]/route";
import { POST as createEducation } from "@/app/api/v1/admin/cv/education/route";
import { PATCH as patchEducation } from "@/app/api/v1/admin/cv/education/[id]/route";
import { toPublicSystem } from "@/lib/rules/publishing";
import { getSkillEvidence, getSystemPace } from "@/lib/queries/evidence";
import { runJob } from "@/lib/jobs/run-job";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

const RUN = `f16b-${Date.now().toString(36)}`;

// Narrows "possibly undefined" for rows a test has just asserted exist.
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`expected ${what}`);
  return value;
}

let adminId: string;
let sessionCookie: string;
let orgId: string;
let plannedId: string;
let inProgressId: string;
let finishedId: string;
let collaboratorId: string;
let ownerRelId: string;

function makeRequest(url: string, method: string, body: object | null): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", cookie: `admin_session=${sessionCookie}` },
    ...(body && { body: JSON.stringify(body) }),
  });
}

let seq = 0;
async function createSystem(extra: object = {}) {
  seq += 1;
  return db.system.create({
    data: {
      name: `F16b System ${seq}`,
      slug: `${RUN}-system-${seq}`,
      description: "F1.6b test fixture.",
      techStack: [],
      organizationId: orgId,
      statusId: plannedId,
      ...extra,
    },
  });
}

const patch = (id: string, body: object) =>
  patchSystem(makeRequest(`http://localhost/api/v1/admin/systems/${id}`, "PATCH", body), {
    params: Promise.resolve({ id }),
  });

beforeAll(async () => {
  const admin = await db.adminUser.create({
    data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);
  orgId = (await db.organization.create({ data: { name: "F16b Org", slug: `${RUN}-org` } })).id;
  plannedId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
  inProgressId = (await db.status.findUniqueOrThrow({ where: { key: "in_progress" } })).id;
  finishedId = (await db.status.findUniqueOrThrow({ where: { key: "finished" } })).id;
  collaboratorId = (await db.repoRelationship.findUniqueOrThrow({ where: { key: "collaborator" } })).id;
  ownerRelId = (await db.repoRelationship.findUniqueOrThrow({ where: { key: "owner" } })).id;
});

afterAll(async () => {
  if (!adminId) return;
  // Retire, don't delete (BR-1.9).
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
  // Experiences first: their skill links cascade, and an in-use Skill can't be deleted.
  await db.experience.deleteMany({ where: { title: { startsWith: RUN } } });
  await db.education.deleteMany({ where: { institution: { startsWith: RUN } } });
  await db.skill.deleteMany({ where: { name: { startsWith: RUN } } });
});

describe("BR-1.11 — a collaborated system is published only with the repo owner's permission", () => {
  it("a collaborator system starts NOT_REQUESTED and can't be published without a GRANTED answer", async () => {
    const system = await createSystem({ repoRelationshipId: collaboratorId });
    expect(system.ownerPermission).toBe("NOT_REQUESTED");
    expect(system.ownerPermissionAt).not.toBeNull();

    await expect(
      db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED" } }),
    ).rejects.toThrow(/BR-1\.11/);
    await expect(
      db.system.update({ where: { id: system.id }, data: { ownerPermission: "REQUESTED", contentStatus: "PUBLISHED" } }),
    ).rejects.toThrow(/BR-1\.11/);
  });

  it("a granted or declined answer must record who gave it", async () => {
    const system = await createSystem({ repoRelationshipId: collaboratorId });
    await expect(
      db.system.update({ where: { id: system.id }, data: { ownerPermission: "GRANTED" } }),
    ).rejects.toThrow(/System_br_1_11_answer_has_source/);

    const granted = await db.system.update({
      where: { id: system.id },
      data: { ownerPermission: "GRANTED", ownerPermissionFrom: "repo-owner", contentStatus: "PUBLISHED" },
    });
    expect(granted.contentStatus).toBe("PUBLISHED");
    expect(granted.ownerPermissionAt).not.toBeNull();
  });

  it("an owned system needs no answer, and refuses one", async () => {
    const system = await createSystem({ repoRelationshipId: ownerRelId });
    expect(system.ownerPermission).toBe("NOT_REQUIRED");
    await expect(
      db.system.update({ where: { id: system.id }, data: { ownerPermission: "REQUESTED" } }),
    ).rejects.toThrow(/BR-1\.11/);
    const published = await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED" } });
    expect(published.contentStatus).toBe("PUBLISHED");
  });

  it("moving a system from collaborator to owner clears the answer that no longer applies", async () => {
    const system = await createSystem({ repoRelationshipId: collaboratorId });
    const moved = await db.system.update({ where: { id: system.id }, data: { repoRelationshipId: ownerRelId } });
    expect(moved.ownerPermission).toBe("NOT_REQUIRED");
  });

  it("a relationship can't start requiring permission while a published system uses it without one", async () => {
    const { id: relId } = await db.repoRelationship.create({
      data: { key: `${RUN}-contrib`, label: "Contributor", requiresOwnerPermission: false },
    });
    const system = await createSystem({ repoRelationshipId: relId });
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED" } });

    const res = await patchLookup(
      makeRequest(`http://localhost/api/v1/lookups/repo-relationship/${relId}`, "PATCH", {
        requiresOwnerPermission: true,
      }),
      { params: Promise.resolve({ type: "repo-relationship", id: relId }) },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("OWNER_PERMISSION_REQUIRED");

    // Unpublished, the same change succeeds and the system now needs an answer.
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "DRAFT" } });
    const ok = await patchLookup(
      makeRequest(`http://localhost/api/v1/lookups/repo-relationship/${relId}`, "PATCH", {
        requiresOwnerPermission: true,
      }),
      { params: Promise.resolve({ type: "repo-relationship", id: relId }) },
    );
    expect(ok.status).toBe(200);
    const after = await db.system.findUniqueOrThrow({ where: { id: system.id } });
    expect(after.ownerPermission).toBe("NOT_REQUESTED");
  });

  it("the admin API answers 409 OWNER_PERMISSION_REQUIRED, then publishes once permission is recorded", async () => {
    const system = await createSystem();
    const blocked = await patch(system.id, { repoRelationship: "collaborator", contentStatus: "published" });
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error.code).toBe("OWNER_PERMISSION_REQUIRED");

    const setRel = await patch(system.id, { repoRelationship: "collaborator", ownerPermission: "requested" });
    expect(setRel.status).toBe(200);
    expect((await setRel.json()).ownerPermission).toBe("requested");

    const noSource = await patch(system.id, { ownerPermission: "granted" });
    expect(noSource.status).toBe(400);

    const granted = await patch(system.id, {
      ownerPermission: "granted",
      ownerPermissionFrom: "repo-owner",
      contentStatus: "published",
    });
    expect(granted.status).toBe(200);
    const body = await granted.json();
    expect(body.repoRelationship).toBe("collaborator");
    expect(body.ownerPermission).toBe("granted");
    expect(body.ownerPermissionAt).toBeTruthy();
  });

  it("the admin API refuses an unknown relationship and an answer on a system that needs none", async () => {
    const system = await createSystem();
    expect((await patch(system.id, { repoRelationship: `${RUN}-nope` })).status).toBe(400);
    expect((await patch(system.id, { ownerPermission: "requested" })).status).toBe(400);
  });
});

describe("BR-1.7 — a private repo is shown as private, never linked", () => {
  it("masks repoUrl and says repoPrivate on the public shape", async () => {
    const system = await createSystem({
      repoPrivate: true,
      repoUrl: "https://github.com/example/private-repo",
      contentStatus: "PUBLISHED",
    });
    const row = await db.publicSystem.findUniqueOrThrow({ where: { id: system.id } });
    const view = toPublicSystem(row);
    expect(view.repoPrivate).toBe(true);
    expect(view.repoUrl).toBeNull();
  });
});

describe("GitHub metadata and weekly activity", () => {
  it("the database refuses malformed metadata", async () => {
    await expect(createSystem({ githubFullName: "not a repo name" })).rejects.toThrow(/System_githubFullName_format/);
    await expect(createSystem({ githubStars: -1 })).rejects.toThrow(/System_githubStars_nonnegative/);
    await expect(createSystem({ githubLanguages: ["TypeScript"] })).rejects.toThrow(/System_githubLanguages_object/);
    const ok = await createSystem({
      githubFullName: `example/${RUN}`,
      githubStars: 3,
      githubLanguages: { TypeScript: 1200 },
      githubTopics: ["nextjs"],
    });
    expect(ok.githubStars).toBe(3);
  });

  it("activity weeks start on a Monday and never go negative", async () => {
    const system = await createSystem();
    await expect(
      db.systemActivityWeek.create({ data: { systemId: system.id, weekStart: new Date("2026-09-15"), commits: 4 } }),
    ).rejects.toThrow(/SystemActivityWeek_weekStart_monday/);
    await expect(
      db.systemActivityWeek.create({ data: { systemId: system.id, weekStart: new Date("2026-09-14"), commits: -1 } }),
    ).rejects.toThrow(/SystemActivityWeek_commits_nonnegative/);
    const ok = await db.systemActivityWeek.create({
      data: { systemId: system.id, weekStart: new Date("2026-09-14"), commits: 4 },
    });
    expect(ok.commits).toBe(4);
  });
});

describe("status history and pace (approved feature 1)", () => {
  it("the database records every status change with its stage, append-only", async () => {
    const system = await createSystem({ contentStatus: "ARCHIVED" });
    await db.system.update({ where: { id: system.id }, data: { statusId: inProgressId } });
    await db.system.update({ where: { id: system.id }, data: { description: "no status change here" } });

    const history = await db.systemStatusChange.findMany({
      where: { systemId: system.id },
      orderBy: { changedAt: "asc" },
    });
    expect(history.map((h) => [h.fromStage, h.toStage])).toEqual([
      [null, "QUEUED"],
      ["QUEUED", "BUILDING"],
    ]);
    expect(history.every((h) => !h.backfilled)).toBe(true);

    const first = must(history[0], "a history row");
    await expect(
      db.systemStatusChange.update({ where: { id: first.id }, data: { toStage: "SHIPPED" } }),
    ).rejects.toThrow(/append-only/);
    await expect(db.systemStatusChange.delete({ where: { id: first.id } })).rejects.toThrow(/append-only/);
  });

  it("pace comes from real transitions only", async () => {
    const system = await createSystem({ contentStatus: "ARCHIVED" });
    await db.system.update({ where: { id: system.id }, data: { statusId: inProgressId } });
    await db.system.update({ where: { id: system.id }, data: { statusId: finishedId } });
    const pace = must((await getSystemPace([system.id]))[0], "a pace row");
    expect(pace.buildingSince).not.toBeNull();
    expect(pace.shippedAt).not.toBeNull();
    expect(pace.daysToShip).toBe(0);
  });
});

describe("auto-drafted journey milestones (approved feature 2, BR-1.12)", () => {
  it("drafts one entry the first time a system ships, never published until the admin approves", async () => {
    const system = await createSystem({ contentStatus: "ARCHIVED", name: `${RUN} Shipper` });
    await db.system.update({ where: { id: system.id }, data: { statusId: finishedId } });
    await db.system.update({ where: { id: system.id }, data: { statusId: inProgressId } });
    await db.system.update({ where: { id: system.id }, data: { statusId: finishedId } });

    const drafts = await db.timeline.findMany({ where: { systemId: system.id } });
    expect(drafts).toHaveLength(1);
    const draft = must(drafts[0], "the auto-drafted entry");
    expect(draft).toMatchObject({ autoDrafted: true, contentStatus: "DRAFT", title: `Shipped ${RUN} Shipper` });

    const listPublic = async () =>
      ((await (await publicTimeline(new NextRequest("http://localhost/api/v1/timeline"))).json()) as { id: string }[]).map(
        (e) => e.id,
      );
    expect(await listPublic()).not.toContain(draft.id);

    // Approving it: published — but the system itself is archived, so it
    // still isn't public (BR-1.12)...
    const res = await patchTimeline(
      makeRequest(`http://localhost/api/v1/admin/timeline/${draft.id}`, "PATCH", {
        milestoneTypeId: draft.milestoneTypeId,
        title: "Shipped it",
        date: "2026-09-19",
        contentStatus: "published",
      }),
      { params: Promise.resolve({ id: draft.id }) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).contentStatus).toBe("published");
    expect(await listPublic()).not.toContain(draft.id);

    // ...until the system is published too.
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED" } });
    expect(await listPublic()).toContain(draft.id);
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "ARCHIVED" } });
  });

  it("a system created already shipped gets history but no dated milestone", async () => {
    const system = await createSystem({ contentStatus: "ARCHIVED", statusId: finishedId });
    expect(await db.timeline.count({ where: { systemId: system.id } })).toBe(0);
    expect(await db.systemStatusChange.count({ where: { systemId: system.id } })).toBe(1);
  });

  it("the first-ship milestone type is data: choosing another hands the flag over", async () => {
    const res = await createLookup(
      makeRequest("http://localhost/api/v1/lookups/milestone-type", "POST", {
        key: `${RUN}-release`,
        label: "Release",
        autoDraftOnShip: true,
      }),
      { params: Promise.resolve({ type: "milestone-type" }) },
    );
    expect(res.status).toBe(201);
    expect(await db.milestoneType.count({ where: { autoDraftOnShip: true } })).toBe(1);

    // Hand it back so the platform keeps its seeded behaviour.
    const launch = await db.milestoneType.findUniqueOrThrow({ where: { key: "launch" } });
    const back = await patchLookup(
      makeRequest(`http://localhost/api/v1/lookups/milestone-type/${launch.id}`, "PATCH", { autoDraftOnShip: true }),
      { params: Promise.resolve({ type: "milestone-type", id: launch.id }) },
    );
    expect(back.status).toBe(200);
    expect((await db.milestoneType.findFirstOrThrow({ where: { autoDraftOnShip: true } })).key).toBe("launch");
  });

  it("refuses extras a lookup type doesn't have", async () => {
    const res = await createLookup(
      makeRequest("http://localhost/api/v1/lookups/repo-relationship", "POST", {
        key: `${RUN}-bad`,
        label: "Bad",
        stage: "shipped",
      }),
      { params: Promise.resolve({ type: "repo-relationship" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("skill evidence (approved feature 4)", () => {
  it("counts published systems and roles only", async () => {
    const category = await db.skillCategory.findFirstOrThrow();
    const skill = await db.skill.create({ data: { name: `${RUN}-skill`, categoryId: category.id } });
    const published = await createSystem({ contentStatus: "PUBLISHED" });
    const draft = await createSystem();
    await db.skillOnSystem.createMany({
      data: [
        { skillId: skill.id, systemId: published.id },
        { skillId: skill.id, systemId: draft.id },
      ],
    });
    await db.experience.create({
      data: {
        title: `${RUN} role`,
        organization: "F16b Org",
        startDate: new Date("2024-01-01"),
        description: "Fixture role.",
        skills: { create: { skillId: skill.id } },
      },
    });

    const evidence = (await getSkillEvidence()).find((e) => e.skillId === skill.id);
    expect(evidence).toMatchObject({ systemSlugs: [published.slug], systemCount: 1, roleCount: 1, inCurrentRole: true });

    await db.skillOnSystem.deleteMany({ where: { skillId: skill.id } });
  });
});

describe("profile and achievements", () => {
  it("the profile exists once, from data already in the repo", async () => {
    const profile = await db.profile.findUniqueOrThrow({ where: { id: 1 }, include: { links: true } });
    expect(profile.displayName).toBe("Kurhula Success Maluleke");
    expect(profile.bio).toBeNull();
    expect(profile.links.map((l) => l.kind).sort()).toEqual(["github", "linkedin", "whatsapp"]);
    await expect(
      db.profile.create({ data: { id: 2, displayName: "Someone", role: "Role", email: "a@b.co" } }),
    ).rejects.toThrow(/Profile_singleton/);
  });

  it("links and achievements must be https", async () => {
    await expect(
      db.profileLink.create({ data: { kind: `${RUN}-x`, label: "X", url: "http://insecure.example" } }),
    ).rejects.toThrow(/ProfileLink_url_format/);
    await expect(
      db.achievement.create({ data: { title: "Cert", achievedOn: new Date("2025-01-01"), url: "http://x.example" } }),
    ).rejects.toThrow(/Achievement_url_format/);
    const achievement = await db.achievement.create({
      data: { title: `${RUN} cert`, achievedOn: new Date("2025-01-01"), url: "https://x.example" },
    });
    expect(achievement.contentStatus).toBe("DRAFT");
    await db.achievement.delete({ where: { id: achievement.id } });
  });
});

describe("job runs — the database is the lock", () => {
  it("records success and failure, and finished runs are immutable", async () => {
    const ok = await runJob(`test.${RUN}`, async () => ({ synced: 3 }));
    expect(ok.status).toBe("succeeded");
    const failed = await runJob(`test.${RUN}`, async () => {
      throw new Error("GitHub said no");
    });
    expect(failed).toMatchObject({ status: "failed", error: "GitHub said no" });

    if (ok.status !== "succeeded") throw new Error("unreachable");
    const row = await db.jobRun.findUniqueOrThrow({ where: { id: ok.runId } });
    expect(row).toMatchObject({ status: "SUCCEEDED", summary: { synced: 3 } });
    await expect(db.jobRun.update({ where: { id: ok.runId }, data: { error: "rewrite" } })).rejects.toThrow(
      /finished run is history/,
    );
  });

  it("refuses an overlapping run of the same job", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const first = runJob(`lock.${RUN}`, async () => {
      await gate;
      return { done: true };
    });
    // Let the first run's RUNNING row land before the second tries.
    await new Promise((r) => setTimeout(r, 200));
    const second = await runJob(`lock.${RUN}`, async () => ({ done: true }));
    expect(second.status).toBe("already_running");
    release();
    expect((await first).status).toBe("succeeded");
  });

  it("a failed run must say why", async () => {
    await expect(
      db.jobRun.create({ data: { job: `test.${RUN}`, status: "FAILED", finishedAt: new Date() } }),
    ).rejects.toThrow(/JobRun_failure_has_error/);
  });
});

describe("education — detail, skills and the admin's show/hide (#70)", () => {
  it("stores field of study and skills, counts only published study as skill evidence", async () => {
    const category = await db.skillCategory.findFirstOrThrow();
    const skill = await db.skill.create({ data: { name: `${RUN}-studied`, categoryId: category.id } });

    const res = await createEducation(
      makeRequest("http://localhost/api/v1/admin/cv/education", "POST", {
        institution: `${RUN} University`,
        qualification: "BSc",
        fieldOfStudy: "Computer Science",
        startDate: "2022-02-01",
        endDate: null,
        certificateUrl: "https://example.com/cert",
        contentStatus: "draft",
        skillIds: [skill.id],
      }),
    );
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry).toMatchObject({
      fieldOfStudy: "Computer Science",
      endDate: null,
      contentStatus: "draft",
      skills: [`${RUN}-studied`],
    });

    // Hidden: not on /cv, and not evidence.
    expect(await db.publicEducation.count({ where: { id: entry.id } })).toBe(0);
    const hidden = (await getSkillEvidence()).find((e) => e.skillId === skill.id);
    expect(hidden?.studyCount).toBe(0);

    // The admin shows it.
    const shown = await patchEducation(
      makeRequest(`http://localhost/api/v1/admin/cv/education/${entry.id}`, "PATCH", {
        institution: `${RUN} University`,
        qualification: "BSc",
        fieldOfStudy: "Computer Science",
        startDate: "2022-02-01",
        contentStatus: "published",
        skillIds: [skill.id],
      }),
      { params: Promise.resolve({ id: entry.id }) },
    );
    expect(shown.status).toBe(200);
    expect(await db.publicEducation.count({ where: { id: entry.id } })).toBe(1);
    const visible = (await getSkillEvidence()).find((e) => e.skillId === skill.id);
    expect(visible?.studyCount).toBe(1);

    await db.education.delete({ where: { id: entry.id } });
  });

  it("the database refuses a non-https certificate link and blank required fields", async () => {
    const base = { qualification: "Diploma", startDate: new Date("2021-01-01") };
    await expect(
      db.education.create({ data: { ...base, institution: `${RUN} College`, certificateUrl: "http://x.example" } }),
    ).rejects.toThrow(/Education_certificateUrl_format/);
    await expect(db.education.create({ data: { ...base, institution: "   " } })).rejects.toThrow(
      /Education_required_present/,
    );
  });
});

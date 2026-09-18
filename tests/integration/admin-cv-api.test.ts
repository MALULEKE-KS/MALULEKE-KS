// tests/integration/admin-cv-api.test.ts
// Hits the real database with a throwaway AdminUser + Experience/Education/
// Skill fixtures.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listExperience, POST as createExperience } from "@/app/api/v1/admin/cv/experience/route";
import { PATCH as patchExperience, DELETE as deleteExperience } from "@/app/api/v1/admin/cv/experience/[id]/route";
import { GET as listEducation, POST as createEducation } from "@/app/api/v1/admin/cv/education/route";
import { DELETE as deleteEducation } from "@/app/api/v1/admin/cv/education/[id]/route";
import { GET as listSkills, POST as createSkill } from "@/app/api/v1/admin/cv/skills/route";
import { DELETE as deleteSkill } from "@/app/api/v1/admin/cv/skills/[id]/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
let categoryId: string;
const createdExperienceIds: string[] = [];
const createdEducationIds: string[] = [];
const createdSkillIds: string[] = [];

function makeRequest(url: string, method: string, body: object | null, withCookie: boolean): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(withCookie ? { cookie: `admin_session=${sessionCookie}` } : {}),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

beforeAll(async () => {
  const admin = await db.adminUser.create({
    data: { email: "test-admin-cv@example.com", passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  const category = await db.skillCategory.findFirstOrThrow({ where: { key: "backend" } });
  categoryId = category.id;
});

afterAll(async () => {
  if (!adminId) return;
  await db.activityLog.deleteMany({ where: { adminUserId: adminId } });
  await db.skillOnExperience.deleteMany({ where: { experienceId: { in: createdExperienceIds } } });
  await db.experience.deleteMany({ where: { id: { in: createdExperienceIds } } });
  await db.education.deleteMany({ where: { id: { in: createdEducationIds } } });
  await db.skill.deleteMany({ where: { id: { in: createdSkillIds } } });
  await db.adminUser.delete({ where: { id: adminId } });
});

describe("GET/POST /api/v1/admin/cv/experience", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listExperience(makeRequest("http://localhost/api/v1/admin/cv/experience", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("creates and lists an experience entry with skill links", async () => {
    const skill = await db.skill.create({ data: { name: "Test Skill A", categoryId } });
    createdSkillIds.push(skill.id);

    const createRes = await createExperience(
      makeRequest(
        "http://localhost/api/v1/admin/cv/experience",
        "POST",
        {
          title: "Test Role",
          organization: "Test Org",
          startDate: "2024-01-01",
          description: "A fixture role.",
          skillIds: [skill.id],
        },
        true
      )
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    createdExperienceIds.push(created.id);
    expect(created.skills).toEqual(["Test Skill A"]);

    const listRes = await listExperience(makeRequest("http://localhost/api/v1/admin/cv/experience", "GET", null, true));
    const body = await listRes.json();
    expect(body.data.some((e: { id: string }) => e.id === created.id)).toBe(true);
  });

  it("updates an experience entry and replaces its skill links", async () => {
    const experience = await db.experience.create({
      data: { title: "Old Title", organization: "Old Org", startDate: new Date("2023-01-01"), description: "Old." },
    });
    createdExperienceIds.push(experience.id);

    const res = await patchExperience(
      makeRequest(
        `http://localhost/api/v1/admin/cv/experience/${experience.id}`,
        "PATCH",
        { title: "New Title", organization: "New Org", startDate: "2023-01-01", description: "New.", skillIds: [] },
        true
      ),
      { params: Promise.resolve({ id: experience.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("New Title");
  });

  it("deletes an experience entry", async () => {
    const experience = await db.experience.create({
      data: { title: "To Delete", organization: "Org", startDate: new Date("2023-01-01"), description: "Fixture." },
    });

    const res = await deleteExperience(
      makeRequest(`http://localhost/api/v1/admin/cv/experience/${experience.id}`, "DELETE", null, true),
      { params: Promise.resolve({ id: experience.id }) }
    );
    expect(res.status).toBe(204);
  });
});

describe("GET/POST /api/v1/admin/cv/education", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listEducation(makeRequest("http://localhost/api/v1/admin/cv/education", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("creates an education entry", async () => {
    const res = await createEducation(
      makeRequest(
        "http://localhost/api/v1/admin/cv/education",
        "POST",
        { institution: "Test University", qualification: "BSc Test", startDate: "2020-01-01" },
        true
      )
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    createdEducationIds.push(body.id);
    expect(body.institution).toBe("Test University");
  });

  it("deletes an education entry", async () => {
    const education = await db.education.create({
      data: { institution: "To Delete U", qualification: "Cert", startDate: new Date("2020-01-01") },
    });

    const res = await deleteEducation(
      makeRequest(`http://localhost/api/v1/admin/cv/education/${education.id}`, "DELETE", null, true),
      { params: Promise.resolve({ id: education.id }) }
    );
    expect(res.status).toBe(204);
  });
});

describe("GET/POST /api/v1/admin/cv/skills", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listSkills(makeRequest("http://localhost/api/v1/admin/cv/skills", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("creates a skill", async () => {
    const res = await createSkill(
      makeRequest("http://localhost/api/v1/admin/cv/skills", "POST", { name: "Test Skill B", categoryId }, true)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    createdSkillIds.push(body.id);
    expect(body.category).toBe("Backend");
  });

  it("blocks deleting a skill still referenced by an Experience (409)", async () => {
    const skill = await db.skill.create({ data: { name: "In Use Skill", categoryId } });
    createdSkillIds.push(skill.id);
    const experience = await db.experience.create({
      data: {
        title: "Uses Skill",
        organization: "Org",
        startDate: new Date("2023-01-01"),
        description: "Fixture.",
        skills: { create: [{ skillId: skill.id }] },
      },
    });
    createdExperienceIds.push(experience.id);

    const res = await deleteSkill(makeRequest(`http://localhost/api/v1/admin/cv/skills/${skill.id}`, "DELETE", null, true), {
      params: Promise.resolve({ id: skill.id }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("SKILL_IN_USE");
  });

  it("deletes an unused skill", async () => {
    const skill = await db.skill.create({ data: { name: "Unused Skill", categoryId } });

    const res = await deleteSkill(makeRequest(`http://localhost/api/v1/admin/cv/skills/${skill.id}`, "DELETE", null, true), {
      params: Promise.resolve({ id: skill.id }),
    });
    expect(res.status).toBe(204);
  });
});

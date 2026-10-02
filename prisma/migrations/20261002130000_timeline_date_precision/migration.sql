-- Journey milestones can be known to the year or the month, not only the day
-- (owner, 2026-10-02: "2025 without a month"). A milestone records how precise
-- its date is, and every reader shows only that much — never an invented day.
-- Then the owner's milestones, from his CV and his own answers.

ALTER TABLE "Timeline" ADD COLUMN "datePrecision" text NOT NULL DEFAULT 'day';
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_date_precision" CHECK ("datePrecision" IN ('day', 'month', 'year'));

-- The public view gains the column (at the end, so the view is replaced in place).
CREATE OR REPLACE VIEW "PublicTimeline" AS
SELECT t.id,
    mt.key AS "milestoneType",
    mt.label AS "milestoneTypeLabel",
    t.title,
    t.description,
    t.date,
    COALESCE(t.tags, ARRAY[]::text[]) AS tags,
    t."autoDrafted",
    t."systemId",
    s.slug AS "systemSlug",
    t."datePrecision"
   FROM "Timeline" t
     JOIN "MilestoneType" mt ON mt.id = t."milestoneTypeId"
     LEFT JOIN "System" s ON s.id = t."systemId"
  WHERE is_live(t."contentStatus", t."publishAt") AND (t."systemId" IS NULL OR is_live(s."contentStatus", s."publishAt"));

-- The owner's milestones (2026-10-02). Each only if its type exists and it
-- isn't there yet, so a replay — or a fresh database before the seed — adds
-- nothing twice and never fails. Dates carry their real precision.
INSERT INTO "Timeline" ("id", "milestoneTypeId", "title", "description", "date", "datePrecision", "tags", "contentStatus", "systemId")
SELECT gen_random_uuid()::text, mt.id, m.title, m.description, m.date::timestamptz, m.precision, m.tags, 'PUBLISHED',
       (SELECT s.id FROM "System" s WHERE s.slug = m.system_slug)
  FROM (VALUES
    ('education', 'Completed Matric — National Senior Certificate', 'The academic foundation for a BSc combining Computer Science and Mathematics.', '2022-01-01', 'year', ARRAY[]::text[], NULL),
    ('job', 'Co-founded GrowthCore Solutions', 'Engineering and analytics, as co-founder.', '2025-01-01', 'year', ARRAY[]::text[], NULL),
    ('launch', 'MALULEKE-KS: the first version, built and deployed', 'A database-backed platform that is its own case study — rules enforced by the database, every change audited.', '2026-09-01', 'month', ARRAY['Next.js', 'PostgreSQL']::text[], 'maluleke-ks'),
    ('launch', 'Let''s Talk opens', 'Structured opportunity intake on MALULEKE-KS: a form shaped to each kind of conversation, a reference for every message.', '2026-10-02', 'day', ARRAY[]::text[], 'maluleke-ks'),
    ('education', 'Expected: BSc Computer Science & Mathematics', 'North-West University.', '2027-01-01', 'year', ARRAY[]::text[], NULL)
  ) AS m(type_key, title, description, date, precision, tags, system_slug)
  JOIN "MilestoneType" mt ON mt.key = m.type_key
 WHERE NOT EXISTS (SELECT 1 FROM "Timeline" t WHERE t.title = m.title);

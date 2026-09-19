-- F1.7 (#72): the public masked views every public page reads, instant search
-- (approved feature 5) and curated numbers (approved feature 6, BR-5.3). Fixes
-- the BR-1.4 leak where the organization list named an anonymized client.
-- Additive only (EXT-1). Generated DDL first, hand-written SQL after.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('COMPUTED', 'MANUAL');

-- CreateEnum
CREATE TYPE "MetricSnapshotStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "Metric" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "MetricSource" NOT NULL,
    "status" "MetricSnapshotStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "decidedById" TEXT,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricSnapshot_metricKey_status_idx" ON "MetricSnapshot"("metricKey", "status");

-- CreateIndex
CREATE INDEX "Skill_name_trgm_idx" ON "Skill" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "System_name_trgm_idx" ON "System" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Timeline_title_trgm_idx" ON "Timeline" USING GIN ("title" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_metricKey_fkey" FOREIGN KEY ("metricKey") REFERENCES "Metric"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ============================================================
-- PUBLIC VIEWS — every visibility and masking rule, in one place
-- ============================================================
-- Public pages read only these views. Each rule lives in SQL, next to the
-- data, so no query can forget one; F1.8 then limits the public site's
-- database role to these views alone.

-- BR-1.4: is the real organization name disclosed for this system?
CREATE FUNCTION public_name_disclosed(v "ClientVisibility", approved boolean)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT v <> 'ANONYMIZED_ONLY' OR approved
$$;

-- BR-1.4: the generic label that replaces a masked name — "a fintech client",
-- "an architecture client", or "a client" without a domain.
CREATE FUNCTION public_client_label(domain_label text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN domain_label IS NULL THEN 'a client'
    WHEN lower(domain_label) ~ '^[aeiou]' THEN 'an ' || lower(domain_label) || ' client'
    ELSE 'a ' || lower(domain_label) || ' client'
  END
$$;

-- BR-1.1 published only · BR-1.3 NDA hides links and screenshot · BR-1.4
-- masked name, and no organization slug to filter or correlate by · BR-1.7 a
-- private repo is never linked.
CREATE VIEW "PublicSystem" AS
SELECT s.id,
       s.name,
       s.slug,
       CASE WHEN public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved")
            THEN o.name ELSE public_client_label(d.label) END AS organization,
       CASE WHEN public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved")
            THEN o.slug END AS "organizationSlug",
       st.key AS "statusKey",
       st.label AS status,
       st."colorToken" AS "statusColorToken",
       lower(st.stage::text) AS stage,
       d.key AS "domainKey",
       d.label AS domain,
       s.description,
       CASE WHEN s."clientVisibility" = 'NDA_RESTRICTED' OR s."repoPrivate" THEN NULL ELSE s."repoUrl" END AS "repoUrl",
       CASE WHEN s."clientVisibility" = 'NDA_RESTRICTED' THEN NULL ELSE s."liveUrl" END AS "liveUrl",
       CASE WHEN s."clientVisibility" = 'NDA_RESTRICTED' THEN NULL ELSE s."screenshotUrl" END AS "screenshotUrl",
       coalesce(s."techStack", ARRAY[]::text[]) AS "techStack",
       s."isFlagship",
       s."repoPrivate",
       s."sortOrder",
       s."featuredOnHome",
       s."homeOrder",
       coalesce(s."caseStudyBody", '') AS "caseStudyBody",
       s."githubPushedAt",
       s."updatedAt"
  FROM "System" s
  JOIN "Organization" o ON o.id = s."organizationId"
  JOIN "Status" st ON st.id = s."statusId"
  LEFT JOIN "Domain" d ON d.id = s."domainId"
 WHERE s."contentStatus" = 'PUBLISHED';

CREATE VIEW "PublicImpact" AS
SELECT i.id, i."systemId", i.label, i.value, i."sortOrder"
  FROM "Impact" i
  JOIN "System" s ON s.id = i."systemId"
 WHERE s."contentStatus" = 'PUBLISHED';

-- BR-6.1 permission is absolute · BR-6.2 only for a published system (or
-- none) · BR-1.4 a testimonial can't reveal a masked client's name either.
CREATE VIEW "PublicTestimonial" AS
SELECT t.id,
       t."systemId",
       t."authorName",
       t."authorRole",
       CASE WHEN s.id IS NULL OR public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved")
            THEN t.organization END AS organization,
       t.quote,
       t."createdAt"
  FROM "Testimonial" t
  LEFT JOIN "System" s ON s.id = t."systemId"
 WHERE t."hasPermission"
   AND (t."systemId" IS NULL OR s."contentStatus" = 'PUBLISHED');

-- BR-1.12: published entries, and only while their system (if any) is published.
CREATE VIEW "PublicTimeline" AS
SELECT t.id,
       mt.key AS "milestoneType",
       mt.label AS "milestoneTypeLabel",
       t.title,
       t.description,
       t.date,
       coalesce(t.tags, ARRAY[]::text[]) AS tags,
       t."autoDrafted",
       t."systemId",
       s.slug AS "systemSlug"
  FROM "Timeline" t
  JOIN "MilestoneType" mt ON mt.id = t."milestoneTypeId"
  LEFT JOIN "System" s ON s.id = t."systemId"
 WHERE t."contentStatus" = 'PUBLISHED'
   AND (t."systemId" IS NULL OR s."contentStatus" = 'PUBLISHED');

-- Only education the admin chose to show.
CREATE VIEW "PublicEducation" AS
SELECT e.id,
       e.institution,
       e.qualification,
       e."fieldOfStudy",
       e."startDate",
       e."endDate",
       e.honors,
       e.description,
       e."certificateUrl",
       coalesce((SELECT array_agg(sk.name ORDER BY sk.name)
                   FROM "SkillOnEducation" se JOIN "Skill" sk ON sk.id = se."skillId"
                  WHERE se."educationId" = e.id), ARRAY[]::text[]) AS skills
  FROM "Education" e
 WHERE e."contentStatus" = 'PUBLISHED';

-- BR-1.4: an organization is listed (for the catalog filter) only when at
-- least one of its published systems discloses its name.
CREATE VIEW "PublicOrganization" AS
SELECT o.id, o.name, o.slug
  FROM "Organization" o
 WHERE EXISTS (
   SELECT 1 FROM "System" s
    WHERE s."organizationId" = o.id
      AND s."contentStatus" = 'PUBLISHED'
      AND public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved"));

-- The homepage ledger: live facts about the owner's own catalog (BR-5.3 —
-- content facts, not statistics). Aggregates only; archived work isn't counted.
CREATE VIEW "PublicLedger" AS
SELECT 1 AS id,
       count(*) FILTER (WHERE st.stage = 'SHIPPED')::int AS "systemsShipped",
       count(*) FILTER (WHERE st.stage = 'BUILDING')::int AS "systemsBuilding",
       count(*) FILTER (WHERE st.stage = 'QUEUED')::int AS "systemsQueued",
       (SELECT count(*)::int FROM "Organization" WHERE role IS NOT NULL) AS "organizationsFounded",
       (SELECT min("startDate") FROM "Experience") AS "firstExperienceAt"
  FROM "System" s
  JOIN "Status" st ON st.id = s."statusId"
 WHERE s."contentStatus" <> 'ARCHIVED';

CREATE VIEW "PublicProfile" AS
SELECT id, "displayName", initials, role, location, email, bio, availability, "buildingSinceYear"
  FROM "Profile";

CREATE VIEW "PublicProfileLink" AS
SELECT id, kind, label, url, "sortOrder"
  FROM "ProfileLink";

-- BR-5.3: only the approved value of each active metric.
CREATE VIEW "PublicMetric" AS
SELECT m.key, m.label, m.description, m.unit, ms.value, ms."decidedAt" AS "approvedAt", m."sortOrder"
  FROM "Metric" m
  JOIN "MetricSnapshot" ms ON ms."metricKey" = m.key AND ms.status = 'APPROVED'
 WHERE m.active;

-- ============================================================
-- Instant search (approved feature 5)
-- ============================================================
-- Reads the public views only, so a search can never surface anything a
-- visitor couldn't see — masking included. Full-text (English stemming) for
-- meaning, trigram similarity for typos and partial words.
CREATE FUNCTION search_public(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE (kind text, key text, title text, subtitle text, rank real)
LANGUAGE sql STABLE AS $$
  WITH q AS (
    SELECT btrim(p_query) AS raw,
           websearch_to_tsquery('english', btrim(p_query)) AS tsq
  ),
  systems AS (
    SELECT 'system'::text AS kind, s.slug AS key, s.name AS title, s.organization AS subtitle,
           setweight(to_tsvector('english', s.name), 'A')
             || setweight(to_tsvector('english', array_to_string(s."techStack", ' ') || ' ' || coalesce(s.domain, '')), 'B')
             || setweight(to_tsvector('english', s.description), 'C') AS doc
      FROM "PublicSystem" s
  ),
  journey AS (
    SELECT 'journey'::text, t.id, t.title, t."milestoneTypeLabel" || ' · ' || to_char(t.date, 'YYYY'),
           setweight(to_tsvector('english', t.title), 'A')
             || setweight(to_tsvector('english', coalesce(t.description, '') || ' ' || array_to_string(t.tags, ' ')), 'C')
      FROM "PublicTimeline" t
  ),
  skills AS (
    SELECT 'skill'::text, e."skillId", e.name, e."categoryKey",
           setweight(to_tsvector('english', e.name), 'A')
      FROM "SkillEvidence" e
  ),
  docs AS (
    SELECT * FROM systems UNION ALL SELECT * FROM journey UNION ALL SELECT * FROM skills
  )
  SELECT d.kind, d.key, d.title, d.subtitle,
         (ts_rank(d.doc, q.tsq) * 2 + similarity(d.title, q.raw))::real AS rank
    FROM docs d, q
   WHERE char_length(q.raw) >= 2
     AND (d.doc @@ q.tsq
          OR d.title % q.raw
          OR strpos(lower(d.title), lower(q.raw)) > 0)
   ORDER BY rank DESC, d.title
   LIMIT greatest(1, least(coalesce(p_limit, 10), 25))
$$;

-- ============================================================
-- Curated numbers (approved feature 6, BR-5.3)
-- ============================================================
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_key_format"
  CHECK (key ~ '^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$');
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_label_present"
  CHECK (char_length(btrim(label)) > 0);

-- One current approved value and one pending proposal per metric.
CREATE UNIQUE INDEX "MetricSnapshot_one_approved" ON "MetricSnapshot" ("metricKey") WHERE status = 'APPROVED';
CREATE UNIQUE INDEX "MetricSnapshot_one_proposed" ON "MetricSnapshot" ("metricKey") WHERE status = 'PROPOSED';

-- A decided snapshot records when; a proposal hasn't been decided.
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_decision_consistent"
  CHECK ((status = 'PROPOSED') = ("decidedAt" IS NULL));

-- Snapshots are history: born PROPOSED, value fixed, forward-only, never deleted.
CREATE FUNCTION enforce_metric_snapshot_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'BR-5.3: metric snapshots are history and are never deleted' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PROPOSED' THEN
      RAISE EXCEPTION 'BR-5.3: a metric value starts as a proposal, never approved on arrival' USING ERRCODE = 'check_violation';
    END IF;
    NEW."decidedAt" := NULL;
    NEW."decidedById" := NULL;
    RETURN NEW;
  END IF;

  IF NEW."metricKey" <> OLD."metricKey" OR NEW.value <> OLD.value OR NEW.source <> OLD.source
     OR NEW."proposedAt" <> OLD."proposedAt" THEN
    RAISE EXCEPTION 'BR-5.3: a proposed value is fixed; propose a new one instead' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT ((OLD.status = 'PROPOSED' AND NEW.status IN ('APPROVED', 'REJECTED', 'SUPERSEDED'))
            OR (OLD.status = 'APPROVED' AND NEW.status = 'SUPERSEDED')) THEN
      RAISE EXCEPTION 'BR-5.3: invalid metric snapshot transition % → %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.status = 'PROPOSED' THEN
      NEW."decidedAt" := now();
    ELSE
      NEW."decidedAt" := OLD."decidedAt";
      NEW."decidedById" := OLD."decidedById";
    END IF;
  ELSE
    NEW."decidedAt" := OLD."decidedAt";
    NEW."decidedById" := OLD."decidedById";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MetricSnapshot_br_5_3_rules"
  BEFORE INSERT OR UPDATE OR DELETE ON "MetricSnapshot"
  FOR EACH ROW EXECUTE FUNCTION enforce_metric_snapshot_rules();

-- Propose a value. No churn: an unchanged value proposes nothing, and a newer
-- proposal replaces an older pending one. Returns the pending proposal's id,
-- or NULL when the value already is the approved one.
CREATE FUNCTION propose_metric_snapshot(p_key text, p_value double precision, p_source "MetricSource")
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  approved_value double precision;
  pending_id text;
  pending_value double precision;
  new_id text;
BEGIN
  -- Serialise decisions per metric.
  PERFORM 1 FROM "Metric" WHERE key = p_key AND active FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BR-5.3: unknown or inactive metric %', p_key USING ERRCODE = 'check_violation';
  END IF;

  SELECT value INTO approved_value FROM "MetricSnapshot" WHERE "metricKey" = p_key AND status = 'APPROVED';
  SELECT id, value INTO pending_id, pending_value FROM "MetricSnapshot" WHERE "metricKey" = p_key AND status = 'PROPOSED';

  IF pending_id IS NOT NULL AND pending_value = p_value THEN
    RETURN pending_id;
  END IF;
  IF pending_id IS NOT NULL THEN
    UPDATE "MetricSnapshot" SET status = 'SUPERSEDED' WHERE id = pending_id;
  END IF;
  IF approved_value IS NOT NULL AND approved_value = p_value THEN
    RETURN NULL;
  END IF;

  INSERT INTO "MetricSnapshot" (id, "metricKey", value, source)
  VALUES (gen_random_uuid()::text, p_key, p_value, p_source)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Approve a proposal: the previous approved value is superseded in the same
-- transaction, so the public number switches atomically.
CREATE FUNCTION approve_metric_snapshot(p_id text, p_admin_id text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  k text;
BEGIN
  SELECT "metricKey" INTO k FROM "MetricSnapshot" WHERE id = p_id;
  IF k IS NULL THEN
    RAISE EXCEPTION 'BR-5.3: no such metric snapshot' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM 1 FROM "Metric" WHERE key = k FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM "MetricSnapshot" WHERE id = p_id AND status = 'PROPOSED') THEN
    RAISE EXCEPTION 'BR-5.3: only a pending proposal can be approved' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE "MetricSnapshot" SET status = 'SUPERSEDED' WHERE "metricKey" = k AND status = 'APPROVED';
  UPDATE "MetricSnapshot" SET status = 'APPROVED', "decidedById" = p_admin_id WHERE id = p_id;
END $$;

-- The numbers the platform can compute (lib/metrics/registry.ts). Labels are
-- the admin's to change; no value is shown until the admin approves one.
INSERT INTO "Metric" (key, label, unit, "sortOrder") VALUES
  ('systems.published', 'Systems published', 'systems', 1),
  ('systems.shipped', 'Systems shipped', 'systems', 2),
  ('skills.evidenced', 'Skills backed by evidence', 'skills', 3),
  ('journey.milestones', 'Journey milestones', 'milestones', 4)
ON CONFLICT (key) DO NOTHING;

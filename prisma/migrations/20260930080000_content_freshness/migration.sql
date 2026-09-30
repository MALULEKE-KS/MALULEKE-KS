-- #89 / BR-1.16: freshness nudges. Content that describes the owner *now* —
-- systems, roles, education and the profile — records when a person last
-- touched it: a real edit to something a visitor sees, or an explicit "mark
-- reviewed". Automatic GitHub sync updates don't count, or synced systems would
-- never look stale (owner's decision, 2026-09-30). Journey entries and
-- achievements are dated events: they don't go stale. The threshold is the
-- admin setting content.freshnessDays, passed to stale_content().

-- Stamps contentReviewedAt when a visitor-facing column (TG_ARGV[0]) changes.
-- An explicit stamp (mark reviewed) is kept, but never in the future.
CREATE FUNCTION stamp_content_reviewed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  tracked text[] := string_to_array(TG_ARGV[0], ',');
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb := to_jsonb(OLD);
  col text;
BEGIN
  IF NEW."contentReviewedAt" > now() THEN
    NEW."contentReviewedAt" := now();
  END IF;
  FOREACH col IN ARRAY tracked LOOP
    IF new_row -> col IS DISTINCT FROM old_row -> col THEN
      NEW."contentReviewedAt" := now();
      EXIT;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

ALTER TABLE "System" ADD COLUMN "contentReviewedAt" timestamptz(3) NOT NULL DEFAULT now();
ALTER TABLE "Experience" ADD COLUMN "contentReviewedAt" timestamptz(3) NOT NULL DEFAULT now();
ALTER TABLE "Education" ADD COLUMN "contentReviewedAt" timestamptz(3) NOT NULL DEFAULT now();
ALTER TABLE "Profile" ADD COLUMN "contentReviewedAt" timestamptz(3) NOT NULL DEFAULT now();

-- Backfill from the last change we know of (an upper bound: nothing can look
-- staler than it is). Only the audit trigger is paused, for these four
-- statements, so the backfill isn't logged as a thousand edits nobody made.
-- migration-guard: allow backfill only — re-enabled four lines below (#89)
ALTER TABLE "System" DISABLE TRIGGER "System_audit";
UPDATE "System" SET "contentReviewedAt" = "updatedAt";
ALTER TABLE "System" ENABLE TRIGGER "System_audit";
-- migration-guard: allow backfill only — re-enabled four lines below (#89)
ALTER TABLE "Experience" DISABLE TRIGGER "Experience_audit";
UPDATE "Experience" SET "contentReviewedAt" = "updatedAt";
ALTER TABLE "Experience" ENABLE TRIGGER "Experience_audit";
-- migration-guard: allow backfill only — re-enabled four lines below (#89)
ALTER TABLE "Education" DISABLE TRIGGER "Education_audit";
UPDATE "Education" SET "contentReviewedAt" = "updatedAt";
ALTER TABLE "Education" ENABLE TRIGGER "Education_audit";
-- migration-guard: allow backfill only — re-enabled four lines below (#89)
ALTER TABLE "Profile" DISABLE TRIGGER "Profile_audit";
UPDATE "Profile" SET "contentReviewedAt" = "updatedAt";
ALTER TABLE "Profile" ENABLE TRIGGER "Profile_audit";

-- Visitor-facing columns only. Not System.slug/repoUrl/liveUrl/github*: the
-- GitHub sync writes those.
CREATE TRIGGER "System_content_reviewed" BEFORE UPDATE ON "System" FOR EACH ROW
  EXECUTE FUNCTION stamp_content_reviewed('name,description,caseStudyBody,techStack,screenshotUrl,statusId,domainId');
CREATE TRIGGER "Experience_content_reviewed" BEFORE UPDATE ON "Experience" FOR EACH ROW
  EXECUTE FUNCTION stamp_content_reviewed('title,organization,location,startDate,endDate,description,highlights');
CREATE TRIGGER "Education_content_reviewed" BEFORE UPDATE ON "Education" FOR EACH ROW
  EXECUTE FUNCTION stamp_content_reviewed('institution,qualification,fieldOfStudy,startDate,endDate,honors,description,certificateUrl,expectedGraduation,coursework');
CREATE TRIGGER "Profile_content_reviewed" BEFORE UPDATE ON "Profile" FOR EACH ROW
  EXECUTE FUNCTION stamp_content_reviewed('displayName,headline,role,location,summary,bio,availability');

-- What needs a look: live content (BR-1.13) — and the profile, which is always
-- shown — not touched for p_days or more, oldest first.
CREATE FUNCTION stale_content(p_days integer)
RETURNS TABLE (kind text, id text, title text, "reviewedAt" timestamptz, "daysSince" integer)
LANGUAGE sql STABLE AS $$
  WITH items AS (
    SELECT 'system'::text AS kind, s.id, s.name AS title, s."contentReviewedAt" AS reviewed
      FROM "System" s WHERE is_live(s."contentStatus", s."publishAt")
    UNION ALL
    SELECT 'experience', x.id, x.title || ' — ' || x.organization, x."contentReviewedAt"
      FROM "Experience" x WHERE is_live(x."contentStatus", x."publishAt")
    UNION ALL
    SELECT 'education', e.id, e.qualification || ' — ' || e.institution, e."contentReviewedAt"
      FROM "Education" e WHERE is_live(e."contentStatus", e."publishAt")
    UNION ALL
    SELECT 'profile', p.id::text, p."displayName", p."contentReviewedAt" FROM "Profile" p
  )
  SELECT i.kind, i.id, i.title, i.reviewed, floor(extract(epoch FROM now() - i.reviewed) / 86400)::integer
    FROM items i
   WHERE i.reviewed <= now() - make_interval(days => greatest(1, p_days))
   ORDER BY i.reviewed, i.kind, i.id
$$;

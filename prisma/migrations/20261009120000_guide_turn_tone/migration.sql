-- AI guide phase 2, P2-4 (docs/AI-GUIDE-PHASE2-PLAN.md §6): the humor governor
-- decides, in code, how much wit a reply may carry. GuideTurn records the level
-- that was decided (never a joke's text) so the owner can see how often the
-- guide stayed steady and how often it played. Additive.

ALTER TABLE "GuideTurn" ADD COLUMN "humor" text;
ALTER TABLE "GuideTurn" ADD CONSTRAINT "GuideTurn_humor_check" CHECK ("humor" IS NULL OR "humor" IN ('off', 'dry', 'playful'));

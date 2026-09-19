-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('SHIPPED', 'BUILDING', 'QUEUED');

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "stage" "PipelineStage" NOT NULL DEFAULT 'QUEUED',
ALTER COLUMN "colorToken" SET DEFAULT 'signal-planned';

-- AlterTable
ALTER TABLE "System" ADD COLUMN     "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "System_featuredOnHome_homeOrder_idx" ON "System"("featuredOnHome", "homeOrder");

-- ============================================================
-- F1.6a (#52, #67) — hand-written additions
-- ============================================================

-- Backfill: existing statuses join the right homepage count. Keys come from
-- prisma/seed.ts; any other status stays QUEUED until the admin sets a stage.
UPDATE "Status" SET "stage" = 'SHIPPED'  WHERE "key" = 'finished';
UPDATE "Status" SET "stage" = 'BUILDING' WHERE "key" = 'in_progress';
UPDATE "Status" SET "stage" = 'QUEUED'   WHERE "key" = 'planned';

-- A status colour must be one of the curated, contrast-checked tokens
-- (DESIGN-SYSTEM.md §1) — never an arbitrary value an admin types.
ALTER TABLE "Status" ADD CONSTRAINT "Status_colorToken_palette"
  CHECK ("colorToken" IN ('signal-finished', 'signal-progress', 'signal-planned'));

ALTER TABLE "System" ADD CONSTRAINT "System_homeOrder_nonnegative"
  CHECK ("homeOrder" >= 0);

-- Setting keys are dotted camelCase paths, e.g. "inquiry.rateLimit.maxPerWindow".
ALTER TABLE "PlatformSetting" ADD CONSTRAINT "PlatformSetting_key_format"
  CHECK ("key" ~ '^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$');

-- #94 (F4.1): every job run records what started it — the schedule, an admin
-- (and which one), or an operator script — so a manual run is attributable.
-- JobRun is exempt from the audit trigger (it is itself run history), so the
-- attribution lives here. Additive.

-- Runs from before this can't be attributed, and finished runs are immutable:
-- adding the column with 'unknown' labels them without rewriting history;
-- new runs then default to 'script' (the runner always states its trigger).
ALTER TABLE "JobRun" ADD COLUMN "trigger" text NOT NULL DEFAULT 'unknown';
ALTER TABLE "JobRun" ALTER COLUMN "trigger" SET DEFAULT 'script';
ALTER TABLE "JobRun" ADD COLUMN "adminUserId" text REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_trigger_known"
  CHECK ("trigger" IN ('schedule', 'admin', 'script', 'unknown'));
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_admin_trigger_names_admin"
  CHECK (("trigger" = 'admin') = ("adminUserId" IS NOT NULL));
CREATE INDEX "JobRun_adminUserId_idx" ON "JobRun" ("adminUserId");

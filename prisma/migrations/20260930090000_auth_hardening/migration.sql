-- #91 / BR-3.2: lockouts escalate. Each consecutive lockout (no successful
-- login in between) doubles the next one, up to a cap — the old flat lockout
-- handed an attacker a fresh set of guesses every period, forever. Additive.
ALTER TABLE "AdminUser" ADD COLUMN "lockoutCount" integer NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_lockoutCount_nonnegative" CHECK ("lockoutCount" >= 0);

-- Login counters are housekeeping for the audit trail (login attempts are
-- logged explicitly, BR-3.4); same redactions as before.
CREATE OR REPLACE TRIGGER "AdminUser_audit" AFTER INSERT OR UPDATE OR DELETE ON "AdminUser"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('passwordHash,twoFactorSecret,recoveryCodes', 'failedLoginCount,lockedUntil,lastLoginAt,lastTotpStep,lockoutCount');

-- F3.1 (#84): TOTP codes are single-use (BR-3.14). The last accepted 30-second
-- step is recorded; a code for that step or an earlier one is refused, so a
-- code can't be replayed within its validity window. Additive.
ALTER TABLE "AdminUser" ADD COLUMN "lastTotpStep" integer;

-- Recording the step is housekeeping, like lastLoginAt: a change to it alone
-- isn't worth an audit entry. Same redactions as before.
CREATE OR REPLACE TRIGGER "AdminUser_audit" AFTER INSERT OR UPDATE OR DELETE ON "AdminUser"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('passwordHash,twoFactorSecret,recoveryCodes', 'failedLoginCount,lockedUntil,lastLoginAt,lastTotpStep');

-- F3: additive session-revocation generation. A password change increments
-- this value; any signed cookie carrying an older version is rejected.
ALTER TABLE "AdminUser" ADD COLUMN "sessionVersion" integer NOT NULL DEFAULT 1;

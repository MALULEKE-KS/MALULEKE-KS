-- Let's Talk (docs/LETS-TALK-SPEC.md LT-6): the inquiry workflow grows from
-- four states to nine. Additive only — existing values keep their names and
-- meaning (REVIEWED reads "Reviewing", RESPONDED reads "In discussion"). Added
-- in their own migration because a new enum value can't be used in the same
-- transaction that adds it; the transitions that use them come next.

ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'NEEDS_INFO';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'ON_HOLD';
ALTER TYPE "InquiryStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

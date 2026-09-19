-- F1.6b (#69, #70): the rows the new tables need in every database, including
-- production, which is never re-seeded. Idempotent: nothing is overwritten if
-- it already exists, so an admin's later edits always win.

-- Repo relationships (BR-1.11). Whether one needs the repo owner's permission
-- is data on the row, editable by the admin.
INSERT INTO "RepoRelationship" (id, key, label, "requiresOwnerPermission")
VALUES (gen_random_uuid()::text, 'owner', 'Owner', false),
       (gen_random_uuid()::text, 'collaborator', 'Collaborator', true)
ON CONFLICT (key) DO NOTHING;

-- The first ship of a system is auto-drafted as a "launch" journey entry,
-- unless the admin has already chosen another type.
UPDATE "MilestoneType" SET "autoDraftOnShip" = true
 WHERE key = 'launch'
   AND NOT EXISTS (SELECT 1 FROM "MilestoneType" WHERE "autoDraftOnShip");

-- The owner's profile, moved from constants in lib/content/sheets.ts into data.
-- Only what the repo already states; the building-since year is what the owner
-- said (full-stack since 2024). Bio and availability stay empty until the
-- owner provides them.
INSERT INTO "Profile" (id, "displayName", initials, role, location, email, "buildingSinceYear")
VALUES (1, 'Kurhula Success Maluleke', 'K.S. Maluleke', 'Founder & Principal Engineer, KSDRILL-SA',
        'South Africa', 'kurhula04s@gmail.com', 2024)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "ProfileLink" (id, "profileId", kind, label, url, "sortOrder")
VALUES (gen_random_uuid()::text, 1, 'github', 'GitHub', 'https://github.com/MALULEKE-KS', 1),
       (gen_random_uuid()::text, 1, 'linkedin', 'LinkedIn', 'https://za.linkedin.com/in/kurhula-success-maluleke-32153231a', 2),
       (gen_random_uuid()::text, 1, 'whatsapp', 'WhatsApp', 'https://wa.me/27640708649', 3)
ON CONFLICT (kind) DO NOTHING;

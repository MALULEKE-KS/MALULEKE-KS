-- The owner's Instagram and X profiles (owner, 2026-10-24: "for socials as insta and twitter
-- … check them out"; read from his signed-in accounts: Instagram kurhula04s, X @ks_drill).
-- Profile links are data (Admin -> Profile -> Links); not on the generated CV (onCv false —
-- the owner can switch either on). A link already there for either kind is kept. Additive only.

INSERT INTO "ProfileLink" (id, "profileId", kind, label, url, "sortOrder", "onCv")
VALUES (gen_random_uuid()::text, 1, 'instagram', 'Instagram', 'https://www.instagram.com/kurhula04s/', 4, false),
       (gen_random_uuid()::text, 1, 'x', 'X', 'https://x.com/ks_drill', 5, false)
ON CONFLICT (kind) DO NOTHING;

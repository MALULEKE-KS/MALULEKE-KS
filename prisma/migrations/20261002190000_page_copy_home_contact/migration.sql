-- The home page's contact band reads its words from the page-copy block too
-- (owner: "everything shouldn't be hardcoded"). Added without touching any
-- key the owner has already edited: existing keys win the merge.
UPDATE "SiteContent"
   SET "body" = '{"home.contact": {"eyebrow": "Contact", "title": "Have something to *build*?", "description": "Tell me what it is. Every inquiry goes through one form, and I review each one."}}'::jsonb || "body"
 WHERE "key" = 'page-copy';

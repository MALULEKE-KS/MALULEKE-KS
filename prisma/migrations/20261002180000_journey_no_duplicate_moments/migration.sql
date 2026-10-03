-- Journey (owner, 2026-10-02: no duplicates). Three year-only milestones,
-- added before the chapters existed, only restate their own chapter's heading
-- (years and place). The chapters tell that story now; these are unpublished —
-- never deleted — and can be shown again in Admin → Journey. Only while they
-- still read exactly as added.
UPDATE "Timeline"
   SET "contentStatus" = 'DRAFT'
 WHERE "contentStatus" = 'PUBLISHED'
   AND "datePrecision" = 'year'
   AND "title" IN (
     'Started at Basopa Secondary School',
     'Began a BSc in Mathematical Sciences at the University of Limpopo',
     'Moved to North-West University'
   );

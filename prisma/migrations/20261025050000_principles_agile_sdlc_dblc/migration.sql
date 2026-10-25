-- The owner, 2026-10-25: Agile, the SDLC and the DBLC are among his top approaches and techniques, and the
-- platform shall say so. Content, not schema: the three lead the "how-i-build" principles (SiteContent; editable
-- and reorderable in the admin). Each one is added only if it isn't there yet, so the migration is safe to replay
-- and never overwrites the owner's own edits. Every line describes how this platform was actually built.

UPDATE "SiteContent"
SET "body" = jsonb_set(
      "body",
      '{principles}',
      (
        SELECT COALESCE(jsonb_agg(n.p ORDER BY n.i), '[]'::jsonb)
        FROM (
          SELECT p, i FROM jsonb_array_elements(jsonb_build_array(
            jsonb_build_object(
              'name', 'Agile Delivery',
              'summary', 'Small working slices, shipped and reviewed sprint by sprint.',
              'body', 'Work moves in small vertical slices, each one working, tested and verified before the next begins, grouped into short sprints with a goal, a release and a review. This platform''s second version was delivered that way: slice by slice, every change shown and approved before it shipped.'),
            jsonb_build_object(
              'name', 'The Software Development Life Cycle (SDLC)',
              'summary', 'Plan, design, build, test, release, maintain, with every stage on record.',
              'body', 'Every system goes through the whole cycle: requirements and a written plan, design, build, testing, release and maintenance. Here that is a constitution and business rules written before the code, an API contract the code implements, unit, integration and end-to-end tests run on every change, and releases batched and verified.'),
            jsonb_build_object(
              'name', 'The Database Life Cycle (DBLC)',
              'summary', 'The data is designed, built and evolved as carefully as the code.',
              'body', 'The database gets a cycle of its own: requirements, conceptual and logical design, the physical schema, implementation, testing and maintenance. Here the business laws are database constraints, every change is an additive migration checked before it merges, and audit triggers record every write.')
          )) WITH ORDINALITY AS t(p, i)
          WHERE NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE("body"->'principles', '[]'::jsonb)) e
            WHERE e->>'name' = t.p->>'name'
          )
        ) n
      ) || COALESCE("body"->'principles', '[]'::jsonb)
    ),
    "updatedAt" = now()
WHERE "key" = 'how-i-build';

-- D-072, the owner (2026-10-24): "a world when u click it it should let you go … inside it its rich particles";
-- "system names shall be the ones that open the system cards then the worlds open". The words of going
-- inside join the "home-orbit" block; anything the owner has written stays. Additive only.

UPDATE "SiteContent"
SET "body" = jsonb_build_object(
    'enterLabel', 'Go inside',
    'backLabel', 'Back to the orbit',
    'insideLine', 'Every light is a commit — {commits} over 26 weeks, one shell a week, the newest outermost and its busiest week the brightest. Its moons are what it''s built with.'
  ) || "body"
WHERE "key" = 'home-orbit';

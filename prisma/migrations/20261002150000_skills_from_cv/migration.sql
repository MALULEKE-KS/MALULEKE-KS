-- The owner's skills (2026-10-02): the site had none, so About, search, the
-- AI guide and the evidence counts had nothing to show. They come from two
-- sources only: the TECHNICAL SKILLS section of his own CV, and the tech
-- stacks of his own published systems. Each skill is then linked to the
-- systems that actually list it — so a skill reads "used in 3 systems",
-- evidence rather than a self-rating. Data, not schema: edited in the admin.

INSERT INTO "Skill" ("id", "name", "categoryId")
SELECT gen_random_uuid()::text, s.name, c.id
  FROM (VALUES
    ('TypeScript', 'languages'), ('JavaScript', 'languages'), ('Python', 'languages'), ('SQL', 'languages'),
    ('Java', 'languages'), ('C++', 'languages'), ('MATLAB', 'languages'),
    ('Next.js', 'frontend'), ('React', 'frontend'), ('Angular', 'frontend'), ('Tailwind CSS', 'frontend'),
    ('shadcn/ui', 'frontend'), ('RxJS', 'frontend'), ('TanStack Query', 'frontend'), ('Zustand', 'frontend'),
    ('React Hook Form', 'frontend'), ('Zod', 'frontend'),
    ('Node.js', 'backend'), ('Express', 'backend'), ('FastAPI', 'backend'), ('Pydantic', 'backend'),
    ('Prisma', 'backend'), ('BullMQ', 'backend'),
    ('PostgreSQL', 'database'), ('Oracle', 'database'), ('MongoDB', 'database'), ('Redis', 'database'), ('ChromaDB', 'database'),
    ('LangChain', 'ai-ml'), ('PyTorch', 'ai-ml'), ('scikit-learn', 'ai-ml'), ('NumPy', 'ai-ml'), ('NetworkX', 'ai-ml'),
    ('OpenCV', 'ai-ml'), ('YOLOv8', 'ai-ml'), ('Hugging Face Transformers', 'ai-ml'), ('Matplotlib', 'ai-ml'),
    ('Docker', 'infra'), ('GitHub Actions', 'infra'), ('Vercel', 'infra'), ('Railway', 'infra'),
    ('Sentry', 'infra'), ('Prometheus', 'infra'), ('Better Stack', 'infra'),
    ('Jest', 'testing'), ('Vitest', 'testing'), ('Playwright', 'testing'), ('React Testing Library', 'testing')
  ) AS s(name, category_key)
  JOIN "SkillCategory" c ON c.key = s.category_key
ON CONFLICT ("name") DO NOTHING;

-- Evidence: a skill is linked to every system whose own stack names it.
INSERT INTO "SkillOnSystem" ("skillId", "systemId")
SELECT sk.id, sy.id
  FROM "Skill" sk
  JOIN "System" sy ON EXISTS (SELECT 1 FROM unnest(sy."techStack") t WHERE lower(t) = lower(sk.name))
ON CONFLICT DO NOTHING;

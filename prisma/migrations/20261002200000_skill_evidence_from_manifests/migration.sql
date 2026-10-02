-- Skill evidence from the repos themselves (spec WP-103, V1 finalization
-- 2026-10-02). The daily GitHub sync reads each public repo's manifests
-- (package.json, requirements.txt, pyproject.toml) into
-- System.githubDependencies; a skill whose alias appears there is linked to
-- that system with source 'manifest'. The owner's own links (source 'owner')
-- are never touched by the sync; a manifest link goes when the dependency does.

ALTER TABLE "System" ADD COLUMN "githubDependencies" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Skill" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "SkillOnSystem" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE "SkillOnSystem" ADD CONSTRAINT "SkillOnSystem_source_check" CHECK ("source" IN ('owner', 'manifest'));

-- Each skill's package names — data, editable with the skill. Normalised as
-- the sync normalises dependencies (lower case; Python's "_" and "." as "-").
-- Only skills that exist, only where no aliases were set.
UPDATE "Skill" s SET "aliases" = a.aliases
  FROM (VALUES
    ('Next.js', ARRAY['next']),
    ('React', ARRAY['react', 'react-dom']),
    ('TypeScript', ARRAY['typescript']),
    ('Tailwind CSS', ARRAY['tailwindcss', '@tailwindcss/postcss', '@tailwindcss/vite']),
    ('shadcn/ui', ARRAY['shadcn', '@radix-ui/react-slot']),
    ('Zod', ARRAY['zod']),
    ('Zustand', ARRAY['zustand']),
    ('TanStack Query', ARRAY['@tanstack/react-query', '@tanstack/query-core']),
    ('React Hook Form', ARRAY['react-hook-form']),
    ('RxJS', ARRAY['rxjs']),
    ('Angular', ARRAY['@angular/core']),
    ('Express', ARRAY['express']),
    ('Prisma', ARRAY['prisma', '@prisma/client']),
    ('BullMQ', ARRAY['bullmq']),
    ('Redis', ARRAY['redis', 'ioredis', '@upstash/redis']),
    ('PostgreSQL', ARRAY['pg', 'postgres', '@neondatabase/serverless', 'psycopg2', 'psycopg2-binary', 'psycopg', 'asyncpg']),
    ('MongoDB', ARRAY['mongodb', 'mongoose', 'pymongo']),
    ('Vitest', ARRAY['vitest']),
    ('Jest', ARRAY['jest']),
    ('Playwright', ARRAY['@playwright/test', 'playwright']),
    ('React Testing Library', ARRAY['@testing-library/react']),
    ('Sentry', ARRAY['@sentry/nextjs', '@sentry/node', '@sentry/react', 'sentry-sdk']),
    ('FastAPI', ARRAY['fastapi']),
    ('Pydantic', ARRAY['pydantic']),
    ('LangChain', ARRAY['langchain', '@langchain/core', 'langchain-core']),
    ('ChromaDB', ARRAY['chromadb']),
    ('PyTorch', ARRAY['torch']),
    ('scikit-learn', ARRAY['scikit-learn', 'sklearn']),
    ('NumPy', ARRAY['numpy']),
    ('NetworkX', ARRAY['networkx']),
    ('OpenCV', ARRAY['opencv-python', 'opencv-python-headless', 'opencv-contrib-python']),
    ('YOLOv8', ARRAY['ultralytics']),
    ('Hugging Face Transformers', ARRAY['transformers']),
    ('Matplotlib', ARRAY['matplotlib']),
    ('Vercel', ARRAY['vercel', '@vercel/analytics', '@vercel/functions'])
  ) AS a(name, aliases)
 WHERE s."name" = a.name
   AND cardinality(s."aliases") = 0;

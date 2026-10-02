-- The journey is the owner's life and career, not his repositories (owner,
-- 2026-10-02: "I thought the journey was about me and my life since day
-- one"). His facts, as he gave them: Basopa High from 2018, Matric 2022, the
-- University of Limpopo in 2023 (BSc Mathematical Sciences — mathematics and
-- computer science), North-West University from 2024, final year now. The
-- chapter text is drafted only from his CV and his own words, marked for his
-- review, and edited in the admin (content block "journey").

-- Milestones he gave, to the year — never an invented day.
INSERT INTO "Timeline" ("id", "milestoneTypeId", "title", "description", "date", "datePrecision", "tags", "contentStatus")
SELECT gen_random_uuid()::text, mt.id, m.title, m.description, (m.date || ' 00:00:00+00')::timestamptz, 'year', ARRAY[]::text[], 'PUBLISHED'
  FROM (VALUES
    ('education', 'Started at Basopa Secondary School', 'High school in Limpopo.', '2018-01-01'),
    ('education', 'Began a BSc in Mathematical Sciences at the University of Limpopo', 'Mathematics and computer science, side by side.', '2023-01-01'),
    ('education', 'Moved to North-West University', 'BSc Computer Science & Mathematics, Mafikeng Campus.', '2024-01-01')
  ) AS m(type_key, title, description, date)
  JOIN "MilestoneType" mt ON mt.key = m.type_key
 WHERE NOT EXISTS (SELECT 1 FROM "Timeline" t WHERE t.title = m.title);

-- Matric: where it happened.
UPDATE "Timeline" SET "description" = 'At Basopa Secondary School, Limpopo — the foundation for a BSc combining Computer Science and Mathematics.'
 WHERE "title" = 'Completed Matric — National Senior Certificate'
   AND "description" = 'The academic foundation for a BSc combining Computer Science and Mathematics.';

-- The chapters (first person, like the rest of the site), from his CV and answers.
INSERT INTO "SiteContent" ("key", "body") VALUES ('journey', $json$
{
  "headline": "From Basopa to building *companies.*",
  "lede": "Mathematics, then code, then companies — all while finishing a degree. The chapters so far, and where it goes next.",
  "chapters": [
    {
      "id": "foundation",
      "from": 2018,
      "to": 2022,
      "title": "The foundation",
      "place": "Basopa Secondary School, Limpopo",
      "body": "I started high school at Basopa in 2018 and finished Matric there in 2022 — the academic foundation that led me to a degree combining Computer Science and Mathematics."
    },
    {
      "id": "limpopo",
      "from": 2023,
      "to": 2023,
      "title": "Mathematics and code",
      "place": "University of Limpopo",
      "body": "University began at the University of Limpopo, with a BSc in Mathematical Sciences — mathematics and computer science side by side."
    },
    {
      "id": "nwu",
      "from": 2024,
      "to": null,
      "title": "North-West University",
      "place": "Mafikeng Campus",
      "body": "In 2024 I moved to North-West University for a BSc in Computer Science and Mathematics, and I'm now in my final year — algorithms and data structures, software engineering, machine learning, cybersecurity and applied mathematics."
    },
    {
      "id": "building",
      "from": 2025,
      "to": null,
      "title": "Building companies",
      "place": "KSDRILL-SA · GrowthCore Solutions",
      "body": "Alongside the degree I founded KSDRILL-SA — AI systems, SaaS platforms, fintech tooling, EdTech and GovTech — and co-founded GrowthCore Solutions, building web products, marketing platforms and analytics dashboards for clients. Every system starts with its architecture — schemas, data flows and API contracts — before a line of code."
    }
  ],
  "ahead": {
    "title": "What's next",
    "body": "Graduating in 2027, and looking for a software engineering role — full-stack, backend or AI/ML — in a team that values ownership, craftsmanship and continuous learning. Open to full-time, part-time, contract and remote work."
  },
  "reviewed": false
}
$json$::jsonb)
ON CONFLICT ("key") DO NOTHING;

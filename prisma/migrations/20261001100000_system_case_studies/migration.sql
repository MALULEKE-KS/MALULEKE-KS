-- F5c /systems/[slug] (owner, 2026-10-01: "they need real details … without going to
-- check the whole code in GitHub"). The first written case study for each system,
-- drawn only from its own repository — README, code, dependencies, history — never
-- from claims the code doesn't back. Each statement fills a field only while it is
-- empty, so nothing the owner has written is ever overwritten; every word stays
-- editable in Admin → Systems. Personal details in the repos (student numbers,
-- family members) are deliberately left out.
--
-- Also: a repo homepage that pointed back at GitHub had become a "live site"
-- (the sync now refuses that — lib/jobs/github-sync.ts liveSite()).

-- Written by the same process the write-up job follows (BR-4.5), so marked generated:
-- the job keeps them current as the repos change, and the owner's edits always win.
SELECT set_config('app.writeup', 'generated', false);

-- ── Xkimi Xa Mali ────────────────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The problem

A family savings group collects a monthly contribution from every member. Done over chat messages and memory, nobody can say with certainty who has paid, what the pool holds, or what happened to a payment that was later reversed. When the money is real, "roughly right" is not good enough.

## How it works

Three Next.js applications share one backend: a **member portal**, an **admin dashboard** and a **public website**. The member portal also hosts the REST API (`/api/v1`, route → service → repository) and the scheduled jobs.

- **Ledger** — every rand lands in an *append-only, double-entry* pool ledger in PostgreSQL. The balance is the sum of credits minus debits, and a nightly reconciliation job checks it.
- **Payments** — an administrator records each transfer or cash payment against the member and the month, with proof of payment. A payment can be reversed but never erased.
- **Jobs** — 23 durable, retryable Inngest functions: contribution reminders, overdue sweeps, month rollover, ledger reconciliation, financial-anomaly watch, backups and more.
- **Members** — each member has a live view of their standing, a year-end forecast and on-time rate, group goals with pledges, and an inbox fed by SMS, email and in-app notifications.

## Engineering decisions

The repository records its decisions as architecture decision records:

- **PostgreSQL on Neon, chosen over Supabase** — ACID transactions are non-negotiable for money.
- **Inngest over plain cron** — jobs that touch money must be durable and retryable.
- **Netcash DebiCheck over PayFast** — a South African recurring-debit mandate. The debit-order machinery is built and tested but deliberately *dormant*: a deployment with no collections provider refuses every money operation rather than pretending.
- **Encryption at rest** — bank and ID numbers are AES-256 encrypted, with a documented key-rotation procedure.

## Built to be trusted

- 179 test files across the three apps.
- 55 database migrations, applied by CI.
- Six GitHub workflows: CI, governance, scheduled backups, a backup self-test, restore drills and preview-database clean-up.
- POPIA-aware data requests and erasure, an audit trail, and admin-signed PDF statements.

## Where it stands

All three apps are live and the operating model works end to end: members pay, an administrator records it with proof. Development paused at a deliberate point (September 2026) — what the group needs next is a record of real contributions that a collections partner will accept, and only time and real payments produce that.
$cs$
WHERE slug = 'xkimi-xa-mali' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Prisma', 'Inngest', 'Redis', 'Vercel']
WHERE slug = 'xkimi-xa-mali' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── MALULEKE-KS (this platform) ──────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The problem

A portfolio usually *claims* things. This one is built to *prove* them: the site you are reading is itself a full-stack, database-backed system, and every claim it makes is enforced somewhere real.

## How it works

- **Next.js 16** (App Router, TypeScript strict) serves the public site, an admin panel and a versioned REST API from one codebase on Vercel.
- **PostgreSQL** (Neon) with Prisma holds everything. Visitors read only through *public views* under a separate database role — unpublished, private or client-restricted rows are not filtered out by the page, they never reach it.
- **A daily scheduler** runs the jobs: the GitHub sync that keeps this catalog current, data retention, and the figures shown on the home page.
- **The CV** is generated on request as PDF and Word from the same records the site shows.
- **The AI guide** answers questions from the site's own data, through the Vercel AI Gateway, read-only and behind feature flags.

## Engineering decisions

- **Rules live in the database.** Business rules — an inquiry starts as new, a system is never deleted, a client's work stays hidden until approved — are database constraints and triggers, not page logic. The platform counts them live on the home page.
- **Every admin change is audited** by database triggers, not by code that a route could forget to call.
- **Nothing hardcoded.** Limits, windows, copy, titles and photos are admin-editable data; growing lists are lookup tables.
- **Every database capability has an endpoint**, enforced by a coverage test, and the API matches a written OpenAPI contract.
- **Admin sign-in is hand-rolled** — signed session cookies with a per-admin version, and two-factor authentication on every write.

## Built to be trusted

- 41 migrations, all additive — a CI guard rejects anything destructive.
- 46 test files: unit tests and integration tests against a real Postgres database.
- Releases ship in reviewed batches, each closing its tracked issues.

## Where it stands

Live in production and growing page by page — this systems catalog is part of the current redesign.
$cs$
WHERE slug = 'maluleke-ks' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "description" = 'This platform: a full-stack, database-backed portfolio whose every claim is enforced by real rules, tests and an audit trail.'
WHERE slug = 'maluleke-ks' AND lower(btrim("description")) IN ('maluleke-ks', '') AND "descriptionSource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS', 'Vercel']
WHERE slug = 'maluleke-ks' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── Sunduza Architectural ────────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The problem

An architectural and drafting practice wins work through enquiries and consultations. Without a site of its own, leads arrive scattered across messages, and there is no single place to show past projects or follow up with a prospective client.

## How it works

A full-stack lead-generation site built through GrowthCore Solutions:

- **Public site** — services, a project portfolio, client testimonials, a contact form and consultation booking, with a POPIA privacy policy.
- **Admin dashboard** — a single-owner back office: a bookings pipeline with a status state machine, project and testimonial management, a message inbox and site settings.
- **API** — public lead-capture endpoints, public reads for projects and testimonials, protected admin endpoints and a health check.
- **Notifications** — a scheduled worker sends email through Resend, protected by a cron secret.

## Engineering decisions

- **Layered code** — routes, then services, then repositories, with shared Zod schemas used by both the browser and the server.
- **Rate limiting** on the public forms with Upstash Redis, and an in-memory fallback in development.
- **Branching discipline** — work lands on an integration branch sprint by sprint; the main branch changes only through release pull requests once staging is verified.
- **Tests** — Vitest unit tests and Playwright end-to-end tests, with CI and governance workflows on every pull request.

## Where it stands

Live, delivered in five sprints (0–4).
$cs$
WHERE slug = 'sunduza-architectural' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS', 'Redis']
WHERE slug = 'sunduza-architectural' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── AI Chatbot Evolution Comparison ──────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The question

Two generations of conversational AI, sixty years apart: a rule-based ELIZA (1966 design) and a modern instruction-tuned language model. What does each actually do better, side by side, on the same input?

## How it works

- **ELIZA** (`eliza.py`) — twelve regular-expression rules, each with response templates, and a reflection engine that turns "I" into "you" and "my" into "your".
- **The language model** (`LLM.py`) — Qwen2.5-1.5B-Instruct run locally through a Hugging Face Transformers pipeline.
- **The comparison** (`chat_comparison.py`) — a Tkinter desktop app with the two conversations side by side. One message goes to both; ELIZA answers immediately while the model generates on a background thread, so the window never freezes.

## What it shows

- ELIZA is instant and fully predictable, but it only recognises the patterns it was given.
- The model handles open-ended input, at the cost of a large download, slower replies and answers that can't be predicted in advance.
- The trade-off — predictability against flexibility — is the same one a team faces today when choosing between a rules engine and an LLM for a narrow task.
$cs$
WHERE slug = 'ai-chatbot-evolution-comparison' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "liveUrl" = NULL
WHERE slug = 'ai-chatbot-evolution-comparison' AND "liveUrl" ~* '^https?://([a-z0-9-]+\.)?github\.com/';

UPDATE "System" SET "techStack" = ARRAY['Python', 'Hugging Face Transformers', 'PyTorch', 'Tkinter']
WHERE slug = 'ai-chatbot-evolution-comparison' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── Graph Search Engine ──────────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The problem

Uninformed search — exploring a graph with no knowledge of where the goal is — underpins route-finding, puzzle solving and crawling. Built for an Artificial Intelligence module, this library implements the three classic strategies cleanly enough to compare them.

## How it works

Each algorithm lives in its own module and takes a graph as an adjacency list:

- **Breadth-first search** — a queue (`collections.deque`); visits level by level and finds the shortest path in an unweighted graph. Time O(V + E), space O(V).
- **Depth-first search** — a stack; follows each branch to its end before backtracking.
- **Iterative deepening DFS** — repeated depth-limited searches with a growing limit, combining DFS's small memory footprint (O(d)) with BFS's completeness.

A runner executes all three on the same test tree and prints each visitation order, depth by depth for IDDFS, then draws the graph with NetworkX.

## Engineering choices

- Type hints throughout, and a clear error when the start node isn't in the graph.
- One module per algorithm, so each can be read, tested and reused on its own.
$cs$
WHERE slug = 'graph-search-engine' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Python', 'NetworkX']
WHERE slug = 'graph-search-engine' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── Logistics Route Optimizer ────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The problem

A delivery truck in the Mahikeng area of the North West needs the cheapest route between towns. Trying every path wastes time; a plain shortest-path search ignores what is known about the road ahead. Built for an Artificial Intelligence module.

## How it works

The network is modelled as a graph of **13 towns and 17 roads** — Mahikeng, Mmabatho, Lichtenburg, Zeerust, Coligny and others — with the distance of each road in kilometres.

**A\* search** ranks every candidate by `f(n) = g(n) + h(n)`:

- `g(n)` — the real distance travelled so far,
- `h(n)` — a traffic-based estimate of the cost still to go,

and always expands the most promising town next, using a priority queue (`heapq`). It returns the optimal path, the order in which towns were explored and the total cost.

## Verification

A separate test case replays the found route as a simulated drive, and a quick verification script re-runs the search without the animation.
$cs$
WHERE slug = 'logistics-route-optimizer' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Python']
WHERE slug = 'logistics-route-optimizer' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── Machine Learning Project (YOLOv8) ────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The problem

Recognising and following everyday objects — people, vehicles, animals — in pictures, recorded video and a live camera, with one program.

## How it works

Built on **YOLOv8** (Ultralytics, the `yolov8n` model trained on the 80 COCO classes) and **OpenCV**, with three modes:

- **Images** — detects every object, draws labelled boxes, counts them and saves the annotated image.
- **Video** — tracks objects frame by frame with persistent IDs, so the same car keeps the same label across frames, and writes an annotated video.
- **Webcam** — live detection with on-screen frames per second, an object count and each detection's confidence, recorded to a file.

## Tuning

Confidence and overlap thresholds are set per mode — lower on the live camera, where objects move and blur, with the frame rate capped for steadier tracking.
$cs$
WHERE slug = 'machine-learning-project' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Python', 'YOLOv8', 'OpenCV', 'PyTorch']
WHERE slug = 'machine-learning-project' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── Network Clustering Analytics ─────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The question

In a dense network — think wireless sensors or IoT devices — 600 nodes drawn on a screen overlap into a blur. Can unsupervised learning find the structure that the eye can't? Built for an Artificial Intelligence module (CMPG 313).

## How it works

- **A realistic network** — a stochastic block model with seven communities: dense connections inside each (probability 0.27–0.32), sparse ones between them (0.05).
- **Layout** — a spring layout, compressed per community, with small random jitter so groups touch instead of separating perfectly.
- **Energy** — each node gets a battery level from 10 to 100, deliberately independent of its position.
- **K-Means** (scikit-learn) groups the nodes by position, run with k = 7 and k = 3, ten initialisations and a fixed random seed so results reproduce.

## What it found

- With k = 7, clusters of 75–95 nodes; with k = 3, about 200 each — the trade-off between detail and a high-level view.
- Low-energy nodes (under 20) appear in every cluster, so position alone can't find the nodes that need attention: energy needs its own analysis.
- Results are shown as 2-D network plots and an interpolated 3-D energy surface.
$cs$
WHERE slug = 'network-clustering-analytics' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Python', 'scikit-learn', 'NetworkX', 'NumPy', 'Matplotlib']
WHERE slug = 'network-clustering-analytics' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── Tshimo Agri Network ──────────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## The brief

A computer-networks semester project (CMPG 325): design the network for a fictional agricultural supplier, simulate it in Cisco Packet Tracer and isolate an assigned fault. The design has to absorb two future changes without re-addressing — a branch office that may open within 18 months, and eight new staff joining one department.

## The design

- **Topology** — one edge router (router-on-a-stick, with NAT/PAT to the internet service provider), a core switch with 802.1Q trunking, and an access switch per department.
- **Addressing** — the `10.23.0.0/16` block, split into four business VLANs plus a management VLAN. Every VLAN gets a uniform `/26` regardless of current headcount, so growth never forces a re-address.

## How the work is kept

The repository separates a *living* design record (`docs/`: requirements, physical and logical topology, the addressing plan, change requests) from *frozen* graded submissions, one folder per milestone — later edits never rewrite what was handed in. Device configurations, connectivity evidence and the fault-isolation write-up each have their own place.

## Where it stands

Milestone 1, the client design review, is complete; the later milestones follow during the semester.
$cs$
WHERE slug = 'tshimo-agri-network' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Cisco Packet Tracer', 'VLANs']
WHERE slug = 'tshimo-agri-network' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── My Angular Portfolio ─────────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## What it is

An earlier personal portfolio, built in Angular to work fluently in a second front-end framework beside React.

## How it works

- **Angular 21** with standalone components, lazy-loaded feature routes and two layouts — the public site and a signed-in dashboard.
- **Public pages** — home, about, projects with a detail view, the tech stack, an engineering philosophy page and a contact form.
- **Dashboard** — manage projects, edit the profile and read messages, behind an authentication guard.
- **Core services** — HTTP interceptors that attach the session, add a request ID to every call and handle errors in one place; a feature-flag service; dark mode; API types generated from a contract.
- **Delivery** — tested with Karma and Playwright, and deployed by GitHub Actions to Firebase Hosting on every merge.
$cs$
WHERE slug = 'my-angular-portfolio' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "description" = 'An earlier portfolio in Angular 21 — lazy-loaded routes, a signed-in dashboard, HTTP interceptors and automated deploys.'
WHERE slug = 'my-angular-portfolio' AND lower(btrim("description")) IN ('my-angular-portfolio', '') AND "descriptionSource" <> 'owner';

UPDATE "System" SET "techStack" = ARRAY['Angular', 'TypeScript', 'Tailwind CSS', 'Firebase']
WHERE slug = 'my-angular-portfolio' AND coalesce(cardinality("techStack"), 0) <= 1;

-- ── My Next.js Portfolio ─────────────────────────────────────────────────────
UPDATE "System" SET "writeupGeneratedAt" = now(), "writeupFromPushedAt" = "githubPushedAt", "caseStudyBody" = $cs$
## What it is

The portfolio before this platform: a statically structured Next.js site that presented the work, the planned flagship systems and the way they are built.

## How it works

- **Pages** — home, capabilities, education, experience, live work, methodology, tech stack, contact, and a flagship catalogue with a page per planned system.
- **Components** — home sections with short teasers that lead to each full page, shared layout and UI primitives, and a contact form backed by an API route.
- **Search engines** — a generated sitemap and robots file.

## Why it was replaced

Everything on it was written into the code. This platform keeps the same story but makes it data — systems synced from GitHub, a CV generated from records, every figure computed live.
$cs$
WHERE slug = 'my-nextjs-portfolio' AND btrim(coalesce("caseStudyBody", '')) = '' AND "caseStudySource" <> 'owner';

UPDATE "System" SET "liveUrl" = 'https://ksdrill-portfolio.vercel.app'
WHERE slug = 'my-nextjs-portfolio' AND "liveUrl" IS NULL;

UPDATE "System" SET "techStack" = ARRAY['Next.js', 'React', 'TypeScript', 'Tailwind CSS']
WHERE slug = 'my-nextjs-portfolio' AND coalesce(cardinality("techStack"), 0) <= 1;

SELECT set_config('app.writeup', '', false);

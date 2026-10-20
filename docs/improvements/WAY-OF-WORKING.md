# V2 — How we work (agile)

**Status: v0.1 — drafted 2026-10-20; the owner answered the open questions the same day (Section 11). Sections marked ◆ are still open for the owner's additions.**

> Owner, 2026-10-20: "we are going to start and launch V2 in an agile approach and work a bit by bit and part by part delivering a working software, so agile must be our core working technique."

This document says **how** V2 is delivered. **What** is built stays `docs/V2-IMPROVEMENT-SPEC.md` (locked; scope changes only by the owner, spec Section 2.4). Agile governs the order, the size of each step and when it ships — never the scope, the non-negotiables (spec 2.3), EXT-1, the business rules or the rule that owner-supplied content is never invented.

## 1. The idea in one paragraph

Deliver V2 in small **vertical slices**, each one a piece of working, tested, verified software — never a layer, never a half-feature. Group slices into short **sprints**, each with one goal a visitor or the owner can see. End every sprint with a **release and a review**: the owner sees it running, accepts or rejects each slice, and chooses what comes next. Learn from each sprint (a three-line retro) and change the plan, not the quality bar.

## 2. Who is who

| Agile role | Here |
|---|---|
| Product owner | The owner (Kurhula). Orders the backlog, accepts or rejects each slice, owns every owner-supplied input and every L3 approval |
| Delivery team | The Claude Code sessions. Slice the work, build it, verify it, record it, and say plainly what is and isn't done |
| Backlog | `V2-IMPROVEMENT-SPEC.md` (the WPs) — locked scope, ordered by Section 13 until the owner reorders |
| Board | `TRACKER.md`: **Next up**, **Current sprint** (slices and their state), the WP table |
| Daily stand-up | The relay: the start-of-session read and the end-of-session handoff entry (spec 0.1) — what was done, what is next, what blocks |
| Decision record | `DECISIONS.md` |
| Increment | What is merged, CI-green and verified; it is *live* at the sprint release |

## 3. The unit of work: the slice

A **WP** is the spec's package (a topic). A **slice** is the part of it that is small enough to finish, verify and show — id `S<sprint>.<n>`, written `WP-111 · slice 1` in prose. A WP is usually 2–5 slices; some are one.

A slice must be:
- **Vertical** — it goes through whatever it needs (migration → contract → code → page/admin → tests) so the result can be seen or measured. "The table" alone is not a slice unless nothing else can show it; then it ships with the first thing that reads it.
- **Small** — one session, one PR. If it won't fit, split it.
- **Valuable on its own** — a visitor sees it, the owner sees it in admin, or a number moves (weight, score, count). If it is half-visible, it ships behind a flag (the existing `Flag` mechanism) and is switched on at the review.
- **Written with its own acceptance** — one to three checks taken from the WP's Acceptance/Verify, so "done" is not a matter of opinion.

Slicing is **just in time**: only the next sprint's WPs are sliced, at the end of the current sprint (refinement). No long up-front breakdown of work that will change.

## 4. Sprints

- **A sprint has a goal**, one sentence, and 3–6 slices that together reach it. If a slice stops serving the goal it is dropped or swapped, not stretched.
- **Length: a week** (owner, 2026-10-20), time-boxed. The sprint ends when the goal is met or the time is up, whichever is first; unfinished slices go back to the backlog (their state is in the tracker), not into an overtime sprint.
- **Work in progress is limited to one slice** at a time (it was already one WP per branch). Owner-blocked work never stops the flow: the next unblocked slice is taken, and the owner's side runs in parallel as the **owner lane** (Section 9).
- **Changes mid-sprint:** the owner can add or swap anything; to keep the goal, something of equal size leaves. New ideas that are not in the spec go to the backlog and need the owner's approval to enter scope (spec 2.4).

## 5. The rhythm

| Moment | What happens | Where it lands |
|---|---|---|
| **Planning** (start of sprint) | Claude proposes the goal and slices from the next WPs in order; the owner changes, adds or approves. Slices get acceptance | TRACKER → *Current sprint*; **Next up** points at the first slice's WP |
| **Daily** (every session) | Read: CLAUDE.md → spec 0.1 → this file → TRACKER (Current sprint, last three handoffs) → DECISIONS. Take the first unfinished slice. Before stopping: the slice's state, a handoff entry, **Next up** | TRACKER |
| **Slice done** | Definition of Done met (Section 6); the PR description carries the Verify output | PR, tracker |
| **Review** (end of sprint) — **live, with the owner** (decided 2026-10-20) | The release is live; Claude lists each slice with *what you can see now*, *how it was verified (numbers)*, *what it doesn't do*. The owner accepts, rejects or changes each; accepted slices are Done | TRACKER, DECISIONS |
| **Retro** | Three lines: keep, stop, try — about the process, not the product. A "try" becomes a change to this file | TRACKER handoff, this file |
| **Refinement** | The next sprint's WPs are sliced; owner inputs it will need are asked for now, not on the day | TRACKER |

## 6. Definitions

**Ready** (a slice may start): it has acceptance; its dependencies are Done or flagged; any owner input it needs is in hand or the slice builds the empty, honest slot (D-003).

**Done** (a slice is merged): everything in the WP's Acceptance for that slice passes **and was run**, with output in the PR description; typecheck, lint, unit and integration tests green, and the e2e (phone, axe) for anything visible; contract first, capability map and generated guides updated (`npm run docs:capabilities`); `ENFORCEMENT-REGISTER.md` row changed if a claim changed; migrations additive only; admin mutations audited; copy and tunables as data (EXT-1, D-010); for any slice that brings in a tool, component or pattern or makes a design decision, an entry in `docs/FRONTEND-CRAFT-RECORD.md` (owner, 2026-10-20); a rollback note (flag off, or expand/contract); the tracker row, a handoff entry and any decision recorded. Nothing is "done" that was only read, not run.

**Released** (a sprint's output is live): the sprint release is on production, `scripts/smoke-build.mjs` and the budgets job (D-027) have passed, and the owner has been told what is new and what to do (switch flags, run jobs).

## 7. Releasing without breaking the deploy budget

Working software every sprint, within Vercel Hobby's daily and monthly caps and the 10 GB Functions Storage limit (DEPLOYMENT.md; an unbatched day of ~15 deploys broke it on 2026-10-08).

- Every push to `main` deploys production, so a slice is **integrated continuously on a short-lived `release/sprint-N` branch**, each slice a PR into it with CI green, and the branch is **released as one PR to `main` at the sprint review**: one production deploy per sprint, more only for a fix or when the owner asks.
- Docs-, tests- and CI-only changes don't build (`vercel-ignore`), so they may go to `main` at any time.
- After a release day: prune superseded deployments (keep the live one plus one rollback).
- **Decided (owner, 2026-10-20: "one release per sprint, master chef"; D-029):** the batch is a sprint, planned at planning, not at the agent's discretion.
- **The push gate (owner, 2026-10-20):** every time work is pushed — a slice into `release/sprint-N`, and the sprint's release to `main` — I tell the owner first, saying what is going and what it does, and wait: **approve, or add recommendations, suggestions or improvements for that slice**. Nothing is pushed on my own say-so. This replaces the 2026-10-01 "the agent plans the timing" freedom for V2: the sprint's timing is planned at planning, the push is the owner's go each time.

## 8. Measuring progress

Progress is working software, shown by:
- **Slices Accepted per sprint** and the sprint goal met or not (the honest measure; no story points).
- **Cycle time** of a slice (claimed → accepted) and how often one is split or rejected.
- **The verifiability targets** (spec Section 10), re-measured at every release by the budgets job and `npm run baseline`: LCP, CLS, axe, metadata, evidence resolution, hand-typed metrics (target 0), eval scoreboard.
- **Deploys used** against the caps.

Each is recorded in the sprint's retro line, with the number.

## 9. The owner lane

Work only the owner can do runs beside the sprints, and each item is asked for in the refinement *before* the sprint that needs it (spec Section 9):

| Needed before | Owner input |
|---|---|
| Sprint 1 | ◆ this file's questions (Section 11); a real-phone pass of the home page; fine-grained GitHub read-only tokens per home (private repos) |
| Sprint 2 | The tier rule for a skill matched by a manifest (WP-103) |
| Sprint 3 | Staleness window for evidence (WP-201); D-004, D-005 confirmed |
| Sprint 4 | Review the Journey chapters (`reviewed: false`); define "L3/L4" |
| Sprint 5 | Error-monitoring and uptime accounts, keys pasted into Vercel (WP-206) |
| Sprint 6 | The guide's daily cap and model, from WP-111's counts (cost, ROADMAP-V2 #14); approval of Xkimi aggregate metrics (WP-403) |
| Sprint 7 | Decisions defended/revisited per flagship (WP-402); postmortem narrative (WP-406); Sunduza testimonial and case-study content (WP-409, 404); mathematics evidence (WP-408); articles (WP-407); Spotball description (WP-405); CV variants (WP-401) |

A slot is built even when the input hasn't arrived; it renders nothing or an honest status (D-003).

## 10. Proposed sprints ◆

Same scope and order as spec Section 13; the sprints only group it. Only Sprint 1 is sliced; the rest are goals, sliced when they come up.

| Sprint | Goal (what is true at its end) | Work packages |
|---|---|---|
| **0** (done 2026-10-20) | The way of working is written and the owner has answered it | — |
| **1** | **A first impression a professional would trust: the home hero rebuilt, and the kit other pages inherit** (owner request, 2026-10-20, D-030; plan: `docs/improvements/HOME-HERO-PLAN.md`) | Owner-requested, outside the WP list; it also closes the home page's part of WP-102 (phone LCP ≤ 2.5 s) |
| **2** | Fast everywhere on a phone, the guide's capacity measured, the domain ready | WP-102 (the rest), WP-111, WP-109 |
| **3** | Skills and work are proven and grouped, not just listed | WP-103 (tier lookup, links to the manifest line), WP-104 (`ProjectGroup`) |
| **4** | Every claim on the site opens its proof | WP-201 |
| **5** | Every number is computed and the site shows its own health | WP-202, WP-203 (remainder) |
| **6** | The quality floor: keyboard, reduced motion, print, empty and error states, monitoring | WP-204 (remainder), WP-205, WP-206 (when the accounts exist) |
| **7** | A guide you can audit | WP-301, WP-302, WP-303, WP-304 |
| **8** | Audience paths and the owner's own stories | WP-401, WP-402, WP-406, WP-407, WP-409 |
| **9** | A signature demo, and the V2 release | WP-501; final baseline vs. baseline-2026-10-10 comparison; release checklist (spec Section 10) |

Owner-blocked WPs (403, 404, 408, 502, 206's accounts) enter the sprint their input arrives in.

**Sprint 1 slices** are in `HOME-HERO-PLAN.md` Section 11 (they follow the Page Build Playbook's stages). The previous Sprint 1 (WP-111 counts, WP-102 LCP slices, WP-109) is now Sprint 2 — the spec's order is unchanged; the hero is an owner request placed first. One option for the owner: WP-111's counter slice is small and its week of data is what the cap decision needs, so it could ride at the front of Sprint 1.

## 11. The owner's answers (2026-10-20)

1. **Sprint length:** a week. ✔
2. **Release rhythm:** one release per sprint. ✔ (D-029). The existing conflict is closed — I need not raise it again.
3. **Review:** live, with the owner. ✔
4. **Order:** keep the spec's order. ✔ (The hero is an owner request placed first, D-030.)
5. **The push gate:** every push, I tell the owner and wait for approve or additions, per slice. ✔ (Section 7.)
6. ◆ **Still open:** anything to add to the Definition of Done; any other rule about how the owner works (hours, how to be told about blockers, what is never to be asked twice).

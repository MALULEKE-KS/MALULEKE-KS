// lib/guide/check-note.ts
// The sentence the chat shows about the guide's own nightly self-check
// (docs/AI-GUIDE-PHASE2-PLAN.md §7), in the owner's words ("ai-guide" block:
// checkNote / checkNoteFailed) filled in with the real run. Nothing is said
// before the first run, or when the owner wrote no wording; a failed check is
// said plainly, never hidden.

import { fillTemplate } from "@/lib/guide/instant";
import type { GuideCheck } from "@/lib/queries/guide-check";

export interface CheckWording {
  checkNote?: string;
  checkNoteFailed?: string;
}

const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function checkNoteOf(check: GuideCheck | null, wording: CheckWording | null): string | null {
  if (!check || !wording || check.total === 0) return null;
  const template = check.failed > 0 ? wording.checkNoteFailed : wording.checkNote;
  if (!template) return null;
  return fillTemplate(template, { date: dateOf(check.ranAt), total: check.total, passed: check.passed, failed: check.failed });
}

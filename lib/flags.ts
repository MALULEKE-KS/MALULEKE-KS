// lib/flags.ts
// Reads the Flag table — every agent tool and gated capability checks here
// first (BR-4.4: new tools ship disabled, opt-in only). Public pages read the
// PublicFlag view (keys and on/off only). FEATURE_FLAGS_KILL_SWITCH=true in
// the environment turns every flag off at once, without touching the data.

import { cache } from "react";
import { dbPublic } from "@/lib/db";

export const FLAGS = {
  concierge: "concierge.enabled",
  openPage: "agent.open_page",
  draftInquiry: "agent.draft_inquiry",
  searchSystems: "agent.search_systems",
  // The guide's card tools (docs/AI-GUIDE-PHASE1-PLAN.md §7): read-only, server-executed.
  showSystems: "agent.show_systems",
  showJourney: "agent.show_journey",
  showSkills: "agent.show_skills",
  showPulse: "agent.show_pulse",
  tailorCv: "agent.tailor_cv",
  writeups: "writeups.enabled",
  // LT-9: confirmations to applicants — off until a sending domain is verified (Resend only delivers to the owner without one).
  applicantEmails: "notifications.applicant_emails",
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

function killSwitchOn() {
  return process.env.FEATURE_FLAGS_KILL_SWITCH === "true";
}

/** Every flag's state, read once per request. */
export const getFlags = cache(async (): Promise<Record<string, boolean>> => {
  if (killSwitchOn()) return {};
  const rows = await dbPublic.publicFlag.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
});

/** Whether one flag is on. Unknown flags are off. */
export async function isFlagOn(key: FlagKey): Promise<boolean> {
  return (await getFlags())[key] === true;
}

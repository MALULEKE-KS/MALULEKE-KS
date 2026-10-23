// lib/admin/activity.ts
// The activity log in plain sentences (D-057). The database writes each change
// as "<table>.<create|update|delete>" (audit_row_change, BR-3.4) and the auth
// routes add "auth.*" events; this turns a key into what the owner did —
// "Updated a system", "Signed in" — and sorts it into a kind for the filter.
// A key it doesn't know reads as the key itself, so a new table is never hidden.

export type ActivityKind = "signins" | "systems" | "inquiries" | "content" | "settings" | "other";

export const ACTIVITY_KINDS: { key: ActivityKind; label: string }[] = [
  { key: "signins", label: "Sign-ins" },
  { key: "systems", label: "Systems" },
  { key: "inquiries", label: "Inquiries" },
  { key: "content", label: "Content" },
  { key: "settings", label: "Settings" },
];

// Each audited table (lower-cased, as the trigger writes it): what one row is, and its kind.
const TABLES: Record<string, [noun: string, kind: ActivityKind]> = {
  system: ["a system", "systems"],
  systemscreenshot: ["a system's screenshot", "systems"],
  systemslughistory: ["a system's old address", "systems"],
  skillonsystem: ["a system's skills", "systems"],
  impact: ["a system's impact figure", "systems"],
  organization: ["an organisation", "systems"],
  inquiry: ["an inquiry", "inquiries"],
  inquirymessage: ["a message on an inquiry", "inquiries"],
  inquirynote: ["a private note on an inquiry", "inquiries"],
  inquirymeeting: ["a meeting on an inquiry", "inquiries"],
  inquirydocument: ["a document on an inquiry", "inquiries"],
  sitecontent: ["page content", "content"],
  profile: ["the profile", "content"],
  profilelink: ["a profile link", "content"],
  profiletitle: ["a title or qualification", "content"],
  profilephoto: ["a photo", "content"],
  timeline: ["a journey entry", "content"],
  experience: ["a role", "content"],
  education: ["an education entry", "content"],
  achievement: ["an achievement", "content"],
  skill: ["a skill", "content"],
  skillonexperience: ["a role's skills", "content"],
  skilloneducation: ["an education entry's skills", "content"],
  testimonial: ["a testimonial", "content"],
  cvupload: ["a CV file", "content"],
  cvoptions: ["the CV options", "content"],
  metric: ["a number", "content"],
  metricsnapshot: ["a number's value", "content"],
  platformsetting: ["a setting", "settings"],
  flag: ["a feature flag", "settings"],
  visitorlens: ["a visitor lens", "settings"],
  status: ["a status (lookup)", "settings"],
  domain: ["a domain (lookup)", "settings"],
  inquirytype: ["an inquiry type (lookup)", "settings"],
  inquirysubtype: ["an inquiry subtype (lookup)", "settings"],
  milestonetype: ["a milestone type (lookup)", "settings"],
  skillcategory: ["a skill category (lookup)", "settings"],
  reporelationship: ["a repo relationship (lookup)", "settings"],
  titlekind: ["a title kind (lookup)", "settings"],
  organizationkind: ["an organisation kind (lookup)", "settings"],
  adminuser: ["the admin account", "signins"],
};

const VERBS: Record<string, string> = { create: "Added", update: "Changed", delete: "Removed" };

const AUTH: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "A sign-in failed",
  "auth.logout": "Signed out",
  "auth.password_changed": "Changed the password",
  "auth.recovery_codes_regenerated": "Made new recovery codes",
  "auth.session_revoked": "Ended a session",
};

export function describeActivity(action: string): { sentence: string; kind: ActivityKind } {
  if (AUTH[action]) return { sentence: AUTH[action], kind: "signins" };
  if (action.startsWith("auth.")) return { sentence: action, kind: "signins" };
  const [table = "", op = ""] = action.split(".");
  const known = TABLES[table];
  const verb = VERBS[op];
  if (!known || !verb) return { sentence: action, kind: "other" };
  return { sentence: `${verb} ${known[0]}`, kind: known[1] };
}

/** The tables (lower-cased) in a kind — the activity log's filter turns these into action prefixes. */
export function tablesOfKind(kind: ActivityKind): string[] {
  return Object.entries(TABLES)
    .filter(([, [, k]]) => k === kind)
    .map(([t]) => t);
}

/** Who did it, from the log's actor type. */
export function describeActor(actorType: string, email: string | null): string {
  if (actorType === "SYSTEM") return "The platform";
  if (actorType === "ANONYMOUS") return "Not signed in";
  return email ?? "You";
}

// lib/inquiries/emails.ts
// The two emails Let's Talk sends (LETS-TALK-SPEC LT-9, LT-10), as plain text.
//
// The applicant's confirmation is fixed copy plus the reference and category —
// never anything they typed, so the form can't be used to put a stranger's
// words (or links) in someone else's inbox. The owner's alert says who and
// what, and links to the admin — the message itself stays in the database.

import type { Inquiry } from "@prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";

export function ownerAlertEmail(i: Pick<Inquiry, "id" | "reference" | "name" | "organization" | "role" | "preferredChannel">, category: string, subtype: string | null, documents: number) {
  const who = [i.name, i.role, i.organization].filter(Boolean).join(" · ");
  return {
    kind: "owner-alert" as const,
    subject: `New message ${i.reference} — ${category}${subtype ? ` · ${subtype}` : ""}`,
    body: [
      `A new message came through Let's Talk.`,
      ``,
      `Reference: ${i.reference}`,
      `Category:  ${category}${subtype ? ` — ${subtype}` : ""}`,
      `From:      ${who}`,
      `Prefers:   ${i.preferredChannel}`,
      ...(documents > 0 ? [`Attached:  ${documents} PDF${documents === 1 ? "" : "s"}`] : []),
      ``,
      `Open it: ${siteUrl()}/admin/inquiries/${i.id}`,
    ].join("\n"),
  };
}

export async function receivedEmail(reference: string, category: string) {
  const [profile, slaHours] = await Promise.all([db.profile.findFirst({ select: { displayName: true } }), getSetting("inquiry.reviewSlaHours")]);
  const name = profile?.displayName ?? "the site's owner";
  const first = name.split(" ")[0] ?? name;
  return {
    kind: "inquiry-received" as const,
    subject: `Received — your reference is ${reference}`,
    body: [
      `Thank you — your message to ${name} was received.`,
      ``,
      `Reference: ${reference}`,
      `About:     ${category}`,
      ``,
      `${first} reviews new messages within ${slaHours} hours and will reach you the way you asked. Quote the reference if you write again.`,
      ``,
      `You didn't need an account, and none was made. To have this message removed, reply and ask.`,
      ``,
      `— ${siteUrl()}`,
    ].join("\n"),
  };
}

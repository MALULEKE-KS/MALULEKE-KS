// lib/notifications/index.ts
// The email outbox (LETS-TALK-SPEC LT-9, LT-10). Mail is queued in the same
// transaction as the change it reports, then sent: straight after the
// response (after()), by the daily job, or by the admin's "retry". A failed
// send is recorded and retried with backoff — it never undoes the inquiry.
//
// Delivery is Resend's HTTP API (owner decision, 2026-10-02), called with
// fetch — no SDK for one POST. Without RESEND_API_KEY nothing is sent and
// nothing is lost: the rows wait, marked as waiting for email to be connected.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

const MAX_ATTEMPTS = 5;
const RESEND_URL = "https://api.resend.com/emails";

export interface QueuedEmail {
  kind: "owner-alert" | "inquiry-received";
  recipient: string;
  subject: string;
  body: string;
  inquiryId?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Queue mail inside the caller's transaction, so it exists exactly when the change does. */
export async function enqueue(tx: Prisma.TransactionClient, email: QueuedEmail) {
  return tx.notification.create({ data: { ...email } });
}

/**
 * LT-9: may this address get another automatic email today? A stranger's
 * address typed into the form can't be flooded.
 */
export async function recipientUnderCap(tx: Prisma.TransactionClient, recipient: string): Promise<boolean> {
  const cap = await getSetting("notifications.recipientDailyCap");
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const sent = await tx.notification.count({ where: { recipient: { equals: recipient, mode: "insensitive" }, kind: "inquiry-received", createdAt: { gte: since } } });
  return sent < cap;
}

/** A provider error, reduced to something safe to store and show: no keys, no echoed input. */
function safeError(status: number, text: string): string {
  const reason = text.replace(/re_[A-Za-z0-9_]+/g, "[key]").replace(/\s+/g, " ").slice(0, 300);
  return `Email provider answered ${status}${reason ? `: ${reason}` : ""}`;
}

async function deliver(n: { recipient: string; subject: string; body: string }): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const [from, replyTo] = await Promise.all([getSetting("notifications.fromAddress"), ownerAddress()]);
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [n.recipient], subject: n.subject, text: n.body, ...(replyTo && { reply_to: replyTo }) }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: safeError(res.status, text) };
    let id: string | null = null;
    try {
      id = (JSON.parse(text) as { id?: string }).id ?? null;
    } catch {
      /* a 2xx without JSON still sent */
    }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "Email provider timed out" : "Couldn't reach the email provider" };
  }
}

/** Send what's due: pending rows whose next attempt has come. Safe to run twice — a row is claimed before it's sent. */
export async function sendDue(limit = 20): Promise<{ sent: number; failed: number; waiting: number }> {
  if (!emailConfigured()) {
    const waiting = await db.notification.count({ where: { state: "PENDING" } });
    return { sent: 0, failed: 0, waiting };
  }
  const due = await db.notification.findMany({ where: { state: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: limit });
  let sent = 0;
  let failed = 0;
  for (const n of due) {
    // Claim it: push the next attempt out first, so a parallel run skips it.
    const claimed = await db.notification.updateMany({
      where: { id: n.id, state: "PENDING", nextAttemptAt: n.nextAttemptAt },
      data: { nextAttemptAt: new Date(Date.now() + 10 * 60 * 1000), attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;
    const result = await deliver(n);
    if (result.ok) {
      sent++;
      await db.notification.update({ where: { id: n.id }, data: { state: "SENT", sentAt: new Date(), providerId: result.id, lastError: null } });
    } else {
      failed++;
      const attempts = n.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await db.notification.update({
        where: { id: n.id },
        data: {
          lastError: result.error,
          state: giveUp ? "FAILED" : "PENDING",
          nextAttemptAt: new Date(Date.now() + Math.min(24 * 60, 5 * 2 ** attempts) * 60 * 1000),
        },
      });
    }
  }
  const waiting = await db.notification.count({ where: { state: "PENDING" } });
  return { sent, failed, waiting };
}

/** Admin "retry": a failed or waiting email goes back to the front of the queue. */
export async function retryNotification(id: string) {
  return db.notification.update({ where: { id }, data: { state: "PENDING", nextAttemptAt: new Date(), attempts: 0 } });
}

/** Where owner alerts go: the setting, else the profile's contact email. */
export async function ownerAddress(): Promise<string | null> {
  const configured = await getSetting("notifications.ownerAddress");
  if (configured) return configured;
  const profile = await db.profile.findFirst({ select: { email: true } });
  return profile?.email ?? null;
}

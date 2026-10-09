// lib/guide/warm-client.ts
// Tell the server the guide is about to be used (docs/AI-GUIDE-PHASE2-PLAN.md §3 A5).
// Once per page load, only when the visitor shows intent (cursor in the chat),
// never when they've asked their browser to save data.

let warmed = false;

export function warmGuide(): void {
  if (warmed || typeof window === "undefined") return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  warmed = true;
  void fetch("/api/v1/guide/warm", { method: "POST", keepalive: true }).catch(() => {
    warmed = false; // try again on the next focus
  });
}

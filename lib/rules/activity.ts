// lib/rules/activity.ts
// What a system's card says about its activity (spec WP-108, V1
// finalization 2026-10-02). Recency is a fact worth showing for work that is
// still being built, or that moved recently; on finished or coursework work,
// "quiet this month · last push 6 months ago" only advertises neglect that
// isn't there. The stage comes from the status lookup (Status.stage), so a new
// status needs no code: shipped | building | queued.

export interface ActivityFacts {
  /** PublicSystem.stage — the status lookup's pipeline stage. */
  stage: string;
  commitsLast4Weeks: number;
  /** "3 days ago", or null when GitHub hasn't reported a push. */
  lastPush: string | null;
}

/** The card's activity line, or null when saying nothing is the honest choice. */
export function activityText({ stage, commitsLast4Weeks, lastPush }: ActivityFacts): string | null {
  if (commitsLast4Weeks > 0) {
    const commits = `${commitsLast4Weeks} commit${commitsLast4Weeks === 1 ? "" : "s"} in 4 weeks`;
    return lastPush ? `${commits} · last push ${lastPush}` : commits;
  }
  if (stage.toLowerCase() === "building") return lastPush ? `Last push ${lastPush}` : null;
  return null;
}

// lib/admin/request.ts
// One way for admin screens to call the admin API (#104): same-origin JSON,
// the contract's error envelope turned into a sentence the owner can act on,
// and an ended session sent back to sign-in instead of failing silently.
// Paths are relative to /api/v1/admin unless they start with /api/ (the
// shared lookup endpoints live at /api/v1/lookups).

export type AdminResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; message: string };

const FALLBACK = "That didn't go through. Try again.";

/** The session is gone: a full page load to sign-in, so no client state from the old session survives. */
export function toSignIn() {
  window.location.replace(new URL("/admin/login?reason=session_ended", window.location.origin).href);
}

export async function adminRequest<T = unknown>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<AdminResult<T>> {
  let res: Response;
  try {
    res = await fetch(path.startsWith("/api/") ? path : `/api/v1/admin${path}`, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return { ok: false, status: 0, message: "Couldn't reach the server. Check your connection and try again." };
  }

  if (res.status === 401) {
    toSignIn();
    return { ok: false, status: 401, message: "Your session ended. Sign in again." };
  }

  const payload = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = (payload as { error?: { message?: string; details?: { issues?: { path?: (string | number)[]; message?: string }[] } } } | null)?.error;
    const issue = error?.details?.issues?.[0];
    const detail = issue?.message ? ` (${issue.path?.join(".") || "input"}: ${issue.message})` : "";
    return { ok: false, status: res.status, message: `${error?.message ?? FALLBACK}${detail}` };
  }
  return { ok: true, status: res.status, data: payload as T };
}

/** The fields of `next` that differ from `base` — so a save sends only what changed. */
export function changedFields<T extends Record<string, unknown>>(base: T, next: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) out[key] = next[key];
  }
  return out;
}

/** An ISO time as the value a datetime-local input shows, in the viewer's time zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value back to an ISO time (null when empty). */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

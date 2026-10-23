// lib/admin/nav.ts
// The admin panel's map (D-057): every page, grouped by what the owner is
// doing, with the waiting count it carries and the public page it edits. One
// list, so the sidebar, the phone dock, the page bar's breadcrumb and the
// search (⌘K) can never disagree about what the admin holds.

import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  FileText,
  Gauge,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Leaf,
  ListChecks,
  PenLine,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/** What waits on the owner, per page — counted by getAdminShell (lib/queries/admin-shell.ts). */
export type AdminCountKey = "inquiries" | "curation" | "journey" | "numbers" | "freshness";

export interface AdminPage {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** One line for the search and the phone menu: what the page is for. */
  hint: string;
  /** The waiting count shown beside it, if any. */
  count?: AdminCountKey;
  /** The public page this one edits — the page bar's "Open on the site". */
  sitePath?: string;
}

export const ADMIN_GROUPS: { label: string; pages: AdminPage[] }[] = [
  { label: "", pages: [{ href: "/admin", label: "Overview", Icon: LayoutDashboard, hint: "What needs you, and how everything is doing", sitePath: "/" }] },
  {
    label: "Content",
    pages: [
      { href: "/admin/systems", label: "Systems", Icon: Boxes, hint: "The catalogue: curate, publish, screenshots", count: "curation", sitePath: "/systems" },
      { href: "/admin/organizations", label: "Organisations", Icon: Building2, hint: "Who each system was built for" },
      { href: "/admin/timeline", label: "Journey", Icon: BookOpen, hint: "Milestones and drafts from the sync", count: "journey", sitePath: "/journey" },
      { href: "/admin/cv", label: "CV", Icon: FileText, hint: "The uploaded CV, its options and its check" },
      { href: "/admin/profile", label: "Profile", Icon: UserRound, hint: "Your details, titles, links and photos", sitePath: "/about" },
      { href: "/admin/content", label: "Page content", Icon: PenLine, hint: "Words on every page", sitePath: "/" },
    ],
  },
  { label: "Inbox", pages: [{ href: "/admin/inquiries", label: "Inquiries", Icon: Inbox, hint: "Let's talk: every conversation", count: "inquiries", sitePath: "/contact" }] },
  {
    label: "Quality",
    pages: [
      { href: "/admin/numbers", label: "Numbers", Icon: BarChart3, hint: "Figures the site shows, and proposals to decide", count: "numbers" },
      { href: "/admin/freshness", label: "Freshness", Icon: Leaf, hint: "Pages nobody has looked at lately", count: "freshness" },
      { href: "/admin/jobs", label: "Jobs", Icon: ListChecks, hint: "The daily run, and run a job now" },
      { href: "/admin/guide", label: "Guide health", Icon: Gauge, hint: "How the AI guide is answering" },
    ],
  },
  {
    label: "Platform",
    pages: [
      { href: "/admin/settings", label: "Settings", Icon: Settings, hint: "Tunables, lookups, flags and lenses" },
      { href: "/admin/activity-log", label: "Activity log", Icon: Activity, hint: "Every change and sign-in" },
      { href: "/admin/account", label: "Account", Icon: KeyRound, hint: "Password, two-factor, recovery codes" },
    ],
  },
];

export const ADMIN_PAGES: AdminPage[] = ADMIN_GROUPS.flatMap((g) => g.pages);

/** The phone dock's cells, in order; Menu is added after them. */
export const ADMIN_DOCK = ["/admin", "/admin/inquiries", "/admin/systems", "/admin/content"] as const;

export function isAdminPageActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The page a path belongs to (the deepest match). */
export function adminPageFor(pathname: string): AdminPage | undefined {
  return [...ADMIN_PAGES].sort((a, b) => b.href.length - a.href.length).find((p) => isAdminPageActive(pathname, p.href));
}

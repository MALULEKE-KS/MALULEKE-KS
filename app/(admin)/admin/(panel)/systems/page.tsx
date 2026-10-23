// app/(admin)/admin/(panel)/systems/page.tsx
// Every system, drafts and archived included (#105; the admin pass, D-057):
// curation first, then most recently changed. Search by name, organisation or
// repository; filter by content status and curation, each with its count. Each
// system shows its current screenshot, what a visitor can see now, what's
// blocking it, and where it's placed; one waiting for curation can be passed
// with "Looks right" without opening it. A table on a laptop, one card per
// system on a phone (no sideways scroll). Server-rendered from the URL, so a
// filtered view is a link. See docs/PAGE-SPECIFICATIONS.md ("/admin/systems").

import Link from "next/link";
import { ArrowUpRight, Boxes, ImageOff, Search, Star } from "lucide-react";
import type { ContentStatus, Prisma } from "@prisma/client";
import { AdminPageHeader, adminInput, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { LooksRight } from "./_components/LooksRight";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; where: Prisma.SystemWhereInput }[] = [
  { key: "all", label: "All", where: {} },
  { key: "curation", label: "Needs curation", where: { needsCuration: true } },
  { key: "published", label: "Published", where: { contentStatus: "PUBLISHED" } },
  { key: "draft", label: "Drafts", where: { contentStatus: "DRAFT" } },
  { key: "archived", label: "Archived", where: { contentStatus: "ARCHIVED" } },
];

const CONTENT_TONE: Record<ContentStatus, "good" | "neutral" | "attention"> = { PUBLISHED: "good", DRAFT: "neutral", ARCHIVED: "neutral" };

export default async function AdminSystemsListPage({ searchParams }: { searchParams: Promise<{ filter?: string; curation?: string; q?: string }> }) {
  const params = await searchParams;
  const active = FILTERS.find((f) => f.key === (params.curation ? "curation" : params.filter)) ?? FILTERS[0]!;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const search: Prisma.SystemWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { githubFullName: { contains: q, mode: "insensitive" } }, { organization: { name: { contains: q, mode: "insensitive" } } }] }
    : {};

  const [systems, counts] = await Promise.all([
    db.system.findMany({
      where: { AND: [active.where, search] },
      include: { organization: true, status: true, repoRelationship: true, screenshots: { where: { supersededAt: null }, select: { sha256: true }, take: 1 } },
      orderBy: [{ needsCuration: "desc" }, { updatedAt: "desc" }],
    }),
    Promise.all(FILTERS.map((f) => db.system.count({ where: { AND: [f.where, search] } }))),
  ]);
  const now = new Date(); // request time: this page renders per request
  const filterHref = (key: string) => {
    const sp = new URLSearchParams({ ...(key !== "all" && { filter: key }), ...(q && { q }) });
    return `/admin/systems${sp.size ? `?${sp}` : ""}`;
  };

  const rows = systems.map((s) => {
    const scheduled = Boolean(s.contentStatus === "PUBLISHED" && s.publishAt && s.publishAt > now);
    const blocked = Boolean((s.clientVisibility !== "PUBLIC" && !s.clientApproved) || (s.repoRelationship?.requiresOwnerPermission && s.ownerPermission !== "GRANTED"));
    const shot = s.screenshots[0];
    return { s, scheduled, blocked, thumb: shot ? `/api/v1/admin/systems/${s.id}/screenshot?v=${shot.sha256.slice(0, 12)}` : null };
  });
  type Row = (typeof rows)[number];

  const thumb = (r: Row, size: string) =>
    r.thumb ? (
      // eslint-disable-next-line @next/next/no-img-element -- an admin-only image route behind the session; no optimiser in between
      <img src={r.thumb} alt="" loading="lazy" className={cn("bg-night-deep border-ink/10 shrink-0 rounded-lg border object-cover object-top", size)} />
    ) : (
      <span aria-hidden="true" className={cn("border-ink/15 bg-paper text-slate grid shrink-0 place-items-center rounded-lg border border-dashed", size)}>
        <ImageOff className="size-4" />
      </span>
    );
  const visitors = (r: Row) => (
    <span className="flex flex-wrap items-center gap-1.5">
      <Pill tone={r.scheduled ? "attention" : CONTENT_TONE[r.s.contentStatus]}>{r.scheduled ? `scheduled ${formatWhen(r.s.publishAt)}` : r.s.contentStatus.toLowerCase()}</Pill>
      {r.s.needsCuration && <Pill tone="attention">needs curation</Pill>}
      {r.blocked && r.s.contentStatus !== "PUBLISHED" && <Pill tone="critical">publish blocked</Pill>}
    </span>
  );
  const placement = (r: Row) => (
    <span className="text-slate flex flex-wrap items-center gap-1.5 text-xs">
      {r.s.isFlagship && (
        <span className="text-accent inline-flex items-center gap-1">
          <Star aria-hidden="true" className="size-3.5 fill-current" /> flagship
        </span>
      )}
      {r.s.featuredOnHome && <span>home #{r.s.homeOrder}</span>}
      {r.s.onCv && <span>CV</span>}
    </span>
  );
  const live = (r: Row) =>
    r.s.contentStatus === "PUBLISHED" && !r.scheduled ? (
      <a href={`/systems/${r.s.slug}`} className="text-slate hover:text-ink inline-flex items-center gap-1 text-xs font-medium">
        On the site <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </a>
    ) : null;

  return (
    <>
      <AdminPageHeader
        icon={Boxes}
        title="Systems"
        description="Everything in the catalogue. GitHub brings new repositories in as drafts for you to look over; you decide what goes live. Systems are never deleted — archive one to retire it."
        rules={["BR-1.6 drafts from GitHub", "BR-1.8 curation", "BR-1.9 never deleted"]}
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Filter systems" className="flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <Link
              key={f.key}
              href={filterHref(f.key)}
              aria-current={f.key === active.key ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                f.key === active.key ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
              )}
            >
              {f.label}
              <span className={cn("font-mono text-xs", f.key === active.key ? "text-mist" : "text-slate")}>{counts[i]}</span>
            </Link>
          ))}
        </nav>
        <form role="search" action="/admin/systems" className="relative md:w-72">
          {active.key !== "all" && <input type="hidden" name="filter" value={active.key} />}
          <label htmlFor="systems-q" className="sr-only">
            Search systems
          </label>
          <Search aria-hidden="true" className="text-slate pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
          <input id="systems-q" name="q" type="search" defaultValue={q} placeholder="Name, organisation or repository" className={cn(adminInput, "ps-10")} />
        </form>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={Boxes}>{q ? `No system matches “${q}”.` : "No systems here."}</EmptyState>
        ) : (
          <>
            {/* Phone and tablet: one card per system. */}
            <ul className="divide-ink/[0.07] -my-2 divide-y md:hidden">
              {rows.map((r) => (
                <li key={r.s.id} className="flex gap-3 py-3">
                  {thumb(r, "h-14 w-20")}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Link href={`/admin/systems/${r.s.id}`} className="text-ink hover:text-accent block truncate font-medium">
                      {r.s.name}
                    </Link>
                    <p className="text-slate text-xs">
                      {r.s.organization.name} · {r.s.status.label}
                    </p>
                    {visitors(r)}
                    <div className="flex flex-wrap items-center gap-3">
                      {placement(r)}
                      {live(r)}
                      {r.s.needsCuration && <LooksRight systemId={r.s.id} sortOrder={r.s.sortOrder} />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Laptop: the dense table. */}
            <div className="-m-5 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-ink/10 text-slate border-b text-left text-xs">
                    <th scope="col" className="px-5 py-3 font-medium">System</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 font-medium">Visitors see</th>
                    <th scope="col" className="px-3 py-3 font-medium">Placement</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Changed</th>
                  </tr>
                </thead>
                <tbody className="divide-ink/[0.06] divide-y">
                  {rows.map((r) => (
                    <tr key={r.s.id} className="hover:bg-paper transition-colors">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          {thumb(r, "h-10 w-16")}
                          <span className="min-w-0">
                            <Link href={`/admin/systems/${r.s.id}`} className="text-ink hover:text-accent font-medium">
                              {r.s.name}
                            </Link>
                            <span className="text-slate flex items-center gap-2 text-xs">
                              {r.s.organization.name}
                              {live(r)}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="text-slate px-3 py-3">{r.s.status.label}</td>
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap items-center gap-2">
                          {visitors(r)}
                          {r.s.needsCuration && <LooksRight systemId={r.s.id} sortOrder={r.s.sortOrder} />}
                        </span>
                      </td>
                      <td className="px-3 py-3">{placement(r)}</td>
                      <td className="text-slate px-5 py-3 text-right text-xs">{formatWhen(r.s.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

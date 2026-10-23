// components/admin/AdminSearch.tsx
// Search the whole admin (D-057): ⌘K / Ctrl+K, or the search button in the
// page bar. One list, filtered as you type: every admin page (with what it's
// for), every system, the latest inquiries by reference or name, every setting
// by its key or what it does, every page-content block. All of it is already
// in the layout (getAdminShell) — no request per keystroke, nothing a signed-in
// admin can't already open. Keyboard-first (cmdk + Radix: arrows, Enter, Esc,
// focus held in the dialog).

"use client";

import { useRouter } from "next/navigation";
import { Boxes, Inbox, PenLine, SlidersHorizontal } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ADMIN_PAGES } from "@/lib/admin/nav";
import type { AdminShellData } from "@/lib/queries/admin-shell";

export function AdminSearch({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: AdminShellData }) {
  const router = useRouter();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose aria-describedby="admin-search-help">
        <DialogTitle className="sr-only">Search the admin</DialogTitle>
        <DialogDescription id="admin-search-help" className="sr-only">
          Find any admin page, system, inquiry, setting or page-content block. Use the arrow keys to choose and Enter to open it.
        </DialogDescription>
        <Command loop>
          <CommandInput placeholder="Pages, systems, inquiries, settings…" aria-label="Search the admin" />
          <CommandList>
            <CommandEmpty>Nothing in the admin matches that.</CommandEmpty>
            <CommandGroup heading="Pages">
              {ADMIN_PAGES.map((p) => (
                <CommandItem key={p.href} value={`page ${p.label} ${p.hint}`} onSelect={() => go(p.href)}>
                  <p.Icon aria-hidden="true" className="text-mist" />
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <span className="text-line hidden shrink-0 truncate text-xs sm:inline">{p.hint}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {data.systems.length > 0 && (
              <CommandGroup heading="Systems">
                {data.systems.map((s) => (
                  <CommandItem key={s.id} value={`system ${s.name} ${s.slug} ${s.organization}`} onSelect={() => go(`/admin/systems/${s.id}`)}>
                    <Boxes aria-hidden="true" className="text-mist" />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="text-line shrink-0 truncate font-mono text-xs">{s.published ? "published" : "not live"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {data.inquiries.length > 0 && (
              <CommandGroup heading="Inquiries">
                {data.inquiries.map((i) => (
                  <CommandItem key={i.id} value={`inquiry ${i.reference} ${i.name ?? ""}`} onSelect={() => go(`/admin/inquiries/${i.id}`)}>
                    <Inbox aria-hidden="true" className="text-mist" />
                    <span className="min-w-0 flex-1 truncate">{i.name ?? "Anonymised"}</span>
                    <span className="text-line shrink-0 font-mono text-xs">
                      {i.reference} · {i.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Settings">
              {data.settings.map((s) => (
                <CommandItem key={s.key} value={`setting ${s.key} ${s.description}`} onSelect={() => go(`/admin/settings?q=${encodeURIComponent(s.key)}`)}>
                  <SlidersHorizontal aria-hidden="true" className="text-mist" />
                  <span className="min-w-0 flex-1 truncate">{s.description}</span>
                  <span className="text-line hidden shrink-0 truncate font-mono text-xs sm:inline">{s.key}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Page content">
              {data.blocks.map((b) => (
                <CommandItem key={b.key} value={`content ${b.title} ${b.key}`} onSelect={() => go(`/admin/content#block-${b.key}`)}>
                  <PenLine aria-hidden="true" className="text-mist" />
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

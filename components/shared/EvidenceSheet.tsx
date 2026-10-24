// components/shared/EvidenceSheet.tsx
// The evidence sheet (docs/EVIDENCE-SPEC.md) — on phones it rises from the bottom, on
// wider screens it's a dialog. Downloaded the first time a visitor opens a chip (D-063):
// the Radix dialog no longer travels with every page that makes a claim.

"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ResolvedClaim } from "@/lib/evidence";
import { ClaimCard } from "@/components/shared/EvidenceClaim";

export default function EvidenceSheet({ open, onOpenChange, claims, label, commit }: { open: boolean; onOpenChange: (open: boolean) => void; claims: ResolvedClaim[]; label: string; commit: string | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 max-w-xl rounded-b-none sm:top-[10vh] sm:bottom-auto sm:rounded-2xl">
        <div className="max-h-[82vh] overflow-y-auto p-5 sm:max-h-[78vh] sm:p-6">
          <p className="text-mist type-micro font-medium">Evidence</p>
          <DialogTitle className="mt-1 pr-8 text-lg font-semibold tracking-tight">{label}</DialogTitle>
          <DialogDescription className="text-mist mt-1 text-[13px]">
            {commit ? `Links open the source at build ${commit.slice(0, 7)} — the code serving this page.` : "Links open the latest source."}
          </DialogDescription>
          <div className="mt-4 grid gap-3">
            {claims.map((c) => (
              <ClaimCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

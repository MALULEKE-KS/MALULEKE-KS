// components/shared/VisitorLensProvider.tsx
// Session-level VisitorLens context (Constitution §4) — persists the 2-tap
// lens choice for the session, reorders priority content across pages
// without requiring login or a separate site per audience.
// TODO: implement — see docs/PLATFORM-CONSTITUTION-v1.md §4.

"use client";

export function VisitorLensProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

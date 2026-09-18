// components/shared/BrandMark.tsx
// The platform mark — the same drawing as app/icon.svg: four corner brackets
// (the selection motif) around one ember square (the flagship marker).
// `currentColor` for the brackets so it works on dark and light surfaces.

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M4 12V4h8M20 4h8v8M28 20v8h-8M12 28H4v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
      <rect x="12" y="12" width="8" height="8" fill="#FF5B1F" />
    </svg>
  );
}

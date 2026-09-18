// components/shared/MarginAnnotations.tsx
// The margin-annotation mechanic (Design System §3a) — a single reusable
// pattern, not a per-page improvisation. On >=768px, real metadata renders
// in a narrow right-hand column in mono type, hairline-divided from the
// content it annotates. Below 768px, the same data collapses into an
// inline badge row directly under the heading — same information, no
// column, since there's no margin to put it in.
//
// Every item here must be real data (an actual domain, an actual date, an
// actual rule ID) — never invented to fill space. Pass an empty array and
// this renders no column/row at all, not a padded placeholder.

interface AnnotationItem {
  label: string;
  value: string;
}

interface MarginAnnotationsProps {
  items: AnnotationItem[];
  // The heading the annotations belong to. Below 768px the badge row renders
  // directly under it (§3a), which is why the heading is a slot here rather
  // than part of `children`: the row can't be placed "under the heading" if
  // it can only ever come after everything.
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function MarginAnnotations({ items, header, children }: MarginAnnotationsProps) {
  return (
    <div className="md:flex md:items-start md:gap-8">
      <div className="min-w-0 flex-1">
        {header}

        {/* <768px: inline badge row directly under the heading, no column */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 md:hidden">
            {items.map((item) => (
              <span
                key={item.label}
                className="font-mono text-xs border border-slate/30 text-slate px-2 py-0.5"
              >
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        )}

        {children}
      </div>

      {/* >=768px: vertical margin column, hairline-divided */}
      {items.length > 0 && (
        <dl className="hidden md:block md:w-40 md:shrink-0 md:border-l md:border-slate/20 md:pl-4 md:pt-1">
          {items.map((item) => (
            <div key={item.label} className="mb-3 last:mb-0">
              <dt className="font-mono text-xs text-slate">{item.label}</dt>
              <dd className="font-mono text-xs text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

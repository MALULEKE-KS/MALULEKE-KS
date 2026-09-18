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
          <div className="mt-3 flex flex-wrap gap-2 md:hidden">
            {items.map((item) => (
              <span key={item.label} className="border-slate/30 text-slate border px-2 py-0.5 font-mono text-xs">
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        )}

        {children}
      </div>

      {/* >=768px: vertical margin column, hairline-divided */}
      {items.length > 0 && (
        <dl className="md:border-slate/20 hidden md:block md:w-40 md:shrink-0 md:border-l md:pt-1 md:pl-4">
          {items.map((item) => (
            <div key={item.label} className="mb-3 last:mb-0">
              <dt className="text-slate font-mono text-xs">{item.label}</dt>
              <dd className="text-ink font-mono text-xs">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

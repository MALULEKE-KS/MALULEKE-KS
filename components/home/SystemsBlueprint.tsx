// components/home/SystemsBlueprint.tsx
// Fig. 1 of the drawing set (DESIGN-SYSTEM.md v2 §6/§7.1): the platform as
// built. The scale figure (the architect) stands at the centre of three
// construction circles; each *published* system is a node on an orthogonal
// leader line, linked to its case study; a dimension line along the bottom
// carries this platform's real stack.
//
// Every element is real data (§4.1): nodes come from the database, status
// colour is the Status row's own token, and nothing is drawn for a system
// that doesn't exist. Pure SVG + CSS (`draw`, `node-in`, `orbit` in
// globals.css) — a server component, no client JS. Reduced motion renders
// the finished drawing.
//
// Two layouts of the same drawing: `wide` (≥640px) and `tall` (phones). One
// drawing scaled down to 327px made every label ~9px; a tall sheet keeps the
// text readable. Only one is ever displayed, and `display:none` also removes
// the other from the accessibility tree, so links aren't announced twice.

import Link from "next/link";

interface BlueprintSystem {
  slug: string;
  name: string;
  status: string;
  statusColorToken: string;
  isFlagship: boolean;
}

interface SystemsBlueprintProps {
  systems: BlueprintSystem[];
  stack: string[];
  ownerLabel: string;
}

interface Layout {
  w: number;
  h: number;
  cx: number;
  cy: number;
  rings: [number, number, number];
  node: { w: number; h: number; name: number; max: number };
  slots: { x: number; y: number }[];
  dimensionPrefix: string;
  dimensionFont: number;
}

const LAYOUTS: Record<"wide" | "tall", Layout> = {
  wide: {
    w: 520,
    h: 540,
    cx: 260,
    cy: 260,
    rings: [72, 118, 168],
    node: { w: 196, h: 64, name: 16, max: 19 },
    slots: [
      { x: 12, y: 40 },
      { x: 312, y: 40 },
      { x: 12, y: 416 },
      { x: 312, y: 416 },
    ],
    dimensionPrefix: "Built on ",
    dimensionFont: 11,
  },
  tall: {
    w: 360,
    h: 580,
    cx: 180,
    cy: 290,
    rings: [58, 94, 136],
    node: { w: 172, h: 62, name: 14, max: 18 },
    slots: [
      { x: 4, y: 36 },
      { x: 184, y: 36 },
      { x: 4, y: 460 },
      { x: 184, y: 460 },
    ],
    dimensionPrefix: "",
    dimensionFont: 10,
  },
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const timing = (delayMs: number, durMs?: number) =>
  ({
    ["--delay" as string]: `${delayMs}ms`,
    ...(durMs ? { ["--dur" as string]: `${durMs}ms` } : {}),
  }) as React.CSSProperties;

function Drawing({
  layout,
  systems,
  stack,
  ownerLabel,
  className,
}: SystemsBlueprintProps & { layout: Layout; className: string }) {
  const { w, h, cx, cy, rings, node } = layout;
  const d = rings[1] * Math.SQRT1_2; // where a 45° leader meets the middle ring
  const placed = systems.slice(0, layout.slots.length);
  const dimY = h - 28;
  const dimensionLabel = `${layout.dimensionPrefix}${stack.join(" / ")}`;
  const labelWidth = dimensionLabel.length * layout.dimensionFont * 0.61 + 18;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-auto w-full overflow-visible ${className}`}
      role="group"
      aria-label={`Drawing of the platform: ${placed.length} published system${placed.length === 1 ? "" : "s"} around the architect`}
    >

      {/* Crosshair + construction circles */}
      <g aria-hidden="true" fill="none">
        <path
          d={`M${cx - rings[2] - 30} ${cy} H${cx + rings[2] + 30} M${cx} ${cy - rings[2] - 20} V${cy + rings[2] + 20}`}
          pathLength={1}
          className="draw stroke-line/20"
          strokeWidth="1"
          style={timing(0, 1200)}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rings[0]}
          pathLength={1}
          className="draw stroke-line/50"
          strokeWidth="1"
          style={timing(150)}
        />
        <g className="node-in" style={timing(500)}>
          <circle cx={cx} cy={cy} r={rings[1]} className="orbit stroke-line/45" strokeWidth="1" strokeDasharray="2 7" />
        </g>
        <circle
          cx={cx}
          cy={cy}
          r={rings[2]}
          pathLength={1}
          className="draw stroke-line/20"
          strokeWidth="1"
          style={timing(300, 1400)}
        />
      </g>

      {/* The scale figure — the architect, drafting himself in */}
      <g aria-hidden="true" className="text-paper" fill="none">
        <circle
          cx={cx}
          cy={cy - 38}
          r="11"
          pathLength={1}
          className="draw scale-figure-stroke"
          style={timing(500, 700)}
        />
        <path
          d={`M${cx} ${cy - 27} V${cy + 22} M${cx} ${cy - 17} L${cx - 17} ${cy + 5} M${cx} ${cy - 17} L${cx + 17} ${cy + 5} M${cx} ${cy + 22} L${cx - 12} ${cy + 60} M${cx} ${cy + 22} L${cx + 12} ${cy + 60}`}
          pathLength={1}
          className="draw scale-figure-stroke"
          style={timing(900, 1100)}
        />
        <text
          x={cx}
          y={cy + 86}
          textAnchor="middle"
          className="node-in fill-mist font-mono"
          fontSize="11"
          style={timing(1600)}
        >
          {ownerLabel}
        </text>
      </g>

      {/* Systems — each a real published system, linked to its case study */}
      {placed.map((system, i) => {
        const slot = layout.slots[i]!;
        const top = i < 2;
        const midX = slot.x + node.w / 2;
        const ringX = midX < cx ? cx - d : cx + d;
        const ringY = top ? cy - d : cy + d;
        const leader = `M${midX} ${top ? slot.y + node.h : slot.y} V${ringY} H${ringX}`;
        const color = `var(--color-${system.statusColorToken}-on-dark, var(--color-${system.statusColorToken}))`;
        const t = 1300 + i * 220;
        return (
          <Link
            key={system.slug}
            href={`/systems/${system.slug}`}
            aria-label={`${system.name}, ${system.status}. Read the case study.`}
            className="group outline-none"
          >
            <path
              d={leader}
              pathLength={1}
              fill="none"
              strokeWidth="1.25"
              className="draw stroke-line group-hover:stroke-ember group-focus-visible:stroke-ember transition-colors"
              style={timing(t, 700)}
            />
            <circle cx={ringX} cy={ringY} r="3.5" className="node-in fill-ember" style={timing(t + 600)} />
            <g className="node-in" style={timing(t + 450)}>
              <rect
                x={slot.x}
                y={slot.y}
                width={node.w}
                height={node.h}
                rx="10"
                className="fill-night-soft stroke-line/60 group-hover:stroke-ember group-focus-visible:stroke-ember transition-colors group-focus-visible:[stroke-width:2.5]"
                strokeWidth="1.25"
              />
              {system.isFlagship && (
                <rect x={slot.x + node.w - 42} y={slot.y + 10} width="8" height="8" rx="4" className="fill-ember">
                  <title>Flagship</title>
                </rect>
              )}
              <text x={slot.x + 14} y={slot.y + 26} className="fill-paper font-sans font-medium" fontSize={node.name}>
                {truncate(system.name, node.max)}
              </text>
              <circle cx={slot.x + 17.5} cy={slot.y + 42.5} r="3.5" style={{ fill: color }} />
              <text x={slot.x + 27} y={slot.y + 46} className="font-mono" fontSize="11" style={{ fill: color }}>
                {system.status}
              </text>
              <path
                d={`M${slot.x + node.w - 22} ${slot.y + 38} L${slot.x + node.w - 12} ${slot.y + 28} M${slot.x + node.w - 20} ${slot.y + 28} H${slot.x + node.w - 12} V${slot.y + 36}`}
                fill="none"
                strokeWidth="1.5"
                className="stroke-line group-hover:stroke-ember group-focus-visible:stroke-ember transition-colors"
              />
            </g>
          </Link>
        );
      })}

      {/* Dimension line — the real stack this platform runs on */}
      <g aria-hidden="true">
        <path
          d={`M10 ${dimY} H${w - 10} M10 ${dimY - 8} V${dimY + 8} M${w - 10} ${dimY - 8} V${dimY + 8} M10 ${dimY} l8 -4 M10 ${dimY} l8 4 M${w - 10} ${dimY} l-8 -4 M${w - 10} ${dimY} l-8 4`}
          pathLength={1}
          fill="none"
          strokeWidth="1"
          className="draw stroke-line/70"
          style={timing(2300, 900)}
        />
        <g className="node-in" style={timing(2900)}>
          <rect x={w / 2 - labelWidth / 2} y={dimY - 9} width={labelWidth} height="18" rx="9" className="fill-night-deep" />
          <text
            x={w / 2}
            y={dimY + 4}
            textAnchor="middle"
            className="fill-mist font-mono"
            fontSize={layout.dimensionFont}
          >
            {dimensionLabel}
          </text>
        </g>
      </g>
    </svg>
  );
}

export function SystemsBlueprint(props: SystemsBlueprintProps) {
  return (
    <figure className="w-full">
      <Drawing {...props} layout={LAYOUTS.wide} className="hidden sm:block" />
      <Drawing {...props} layout={LAYOUTS.tall} className="sm:hidden" />
    </figure>
  );
}

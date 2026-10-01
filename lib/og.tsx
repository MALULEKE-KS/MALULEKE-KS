// lib/og.tsx — the Open Graph card (#101), shared by the site default and each
// case study: the graphite field, the K-S mark and wordmark, an eyebrow, a
// title and a line of description, in the design system's colours — and the
// K-S Cube rendered in 3D (design/brand/), as on the 404 page and the
// home-screen icon. Rendered by
// next/og (Satori), so layout uses flexbox only.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteUrl } from "@/lib/site-url";

export const OG_SIZE = { width: 1200, height: 630 };

interface OgCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
}

// The flat mark's paths (components/shared/BrandMark.tsx, regular cut).
const LETTERS = [
  "M6 15L12.6 15L12.6 49L6 49Z",
  "M15.2 30.3L23 15L30.2 15L22.4 30.3Z",
  "M15.2 33.7L22.4 33.7L30.2 49L23 49Z",
  "M58.14 18.61A10.1 10.1 0 1 0 48.99 35.1L49.89 28.76A3.7 3.7 0 1 1 53.23 22.72Z",
  "M51.81 28.9A10.1 10.1 0 1 1 42.66 45.39L47.57 41.28A3.7 3.7 0 1 0 50.91 35.24Z",
];
const BLOCK = "M32.4 29.4L37.6 29.4L37.6 34.6L32.4 34.6Z";

// Read once per server instance; a missing file just leaves the piece out.
let piece: Promise<string | null> | null = null;
function threeDPiece() {
  piece ??= readFile(join(process.cwd(), "design/brand/ks-cube-3d-og.png"), "base64")
    .then((b64) => `data:image/png;base64,${b64}`)
    .catch(() => null);
  return piece;
}

export async function renderOgCard({ eyebrow, title, subtitle, badge }: OgCardProps) {
  const host = siteUrl().replace(/^https?:\/\//, "");
  const ks3d = await threeDPiece();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#0B0C0E",
        backgroundImage:
          "radial-gradient(40rem 26rem at 85% 30%, rgba(255,91,31,0.16), transparent 70%), radial-gradient(34rem 24rem at 5% 100%, rgba(96,130,170,0.14), transparent 70%)",
        color: "#F4F2EE",
      }}
    >
      {ks3d && (
        // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
        <img src={ks3d} width={500} height={360} alt="" style={{ position: "absolute", right: 30, top: 150 }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <svg width="74" height="48" viewBox="4 13 58.5 38">
            {LETTERS.map((d) => (
              <path key={d} d={d} fill="#F4F2EE" />
            ))}
            <path d={BLOCK} fill="#FF5B1F" />
          </svg>
          {/* The wordmark's hyphen as a short ember bar: Satori spaces a coloured glyph apart from its word. */}
          <div style={{ display: "flex", alignItems: "center", fontSize: 28, letterSpacing: "-0.01em" }}>
            <span>MALULEKE</span>
            <div style={{ display: "flex", width: "13px", height: "4px", margin: "2px 2px 0 -2px", backgroundColor: "#FF5B1F" }} />
            <span>KS</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: ks3d ? "590px" : "1000px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: 26, color: "#A3A9B1" }}>{eyebrow}</span>
            {badge && (
              <span
                style={{
                  fontSize: 22,
                  color: "#FF5B1F",
                  border: "2px solid rgba(255,91,31,0.5)",
                  borderRadius: 999,
                  padding: "4px 16px",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: title.length > 28 ? 60 : 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 30, color: "#A3A9B1", lineHeight: 1.35 }}>
              {subtitle.length > 110 ? `${subtitle.slice(0, 107)}…` : subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: "#7C858F" }}>
          <span>{host}</span>
          <div style={{ display: "flex", width: "120px", height: "8px", borderRadius: 999, backgroundColor: "#FF5B1F" }} />
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}

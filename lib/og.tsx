// lib/og.tsx — the Open Graph card (#101), shared by the site default and each
// case study: the graphite field, the brand mark, an eyebrow, a title and a
// line of description, in the design system's colours. Rendered by next/og
// (Satori), so layout uses flexbox only.

import { ImageResponse } from "next/og";
import { siteUrl } from "@/lib/site-url";

export const OG_SIZE = { width: 1200, height: 630 };

interface OgCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
}

export function renderOgCard({ eyebrow, title, subtitle, badge }: OgCardProps) {
  const host = siteUrl().replace(/^https?:\/\//, "");
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: "#0B0C0E",
        backgroundImage:
          "radial-gradient(40rem 26rem at 85% 10%, rgba(255,91,31,0.22), transparent 70%), radial-gradient(34rem 24rem at 5% 100%, rgba(96,130,170,0.16), transparent 70%)",
        color: "#F4F2EE",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <svg width="56" height="56" viewBox="0 0 32 32">
          <path
            d="M4 12V4h8M20 4h8v8M28 20v8h-8M12 28H4v-8"
            fill="none"
            stroke="#F4F2EE"
            strokeWidth="3"
            strokeLinecap="square"
          />
          <rect x="12" y="12" width="8" height="8" fill="#FF5B1F" />
        </svg>
        <span style={{ fontSize: 28, letterSpacing: "-0.01em" }}>MALULEKE-KS</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
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
            fontSize: title.length > 40 ? 64 : 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 32, color: "#A3A9B1", lineHeight: 1.35, maxWidth: "1000px" }}>
            {subtitle.length > 140 ? `${subtitle.slice(0, 137)}…` : subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          color: "#7C858F",
        }}
      >
        <span>{host}</span>
        <div
          style={{
            display: "flex",
            width: "120px",
            height: "8px",
            borderRadius: 999,
            backgroundColor: "#FF5B1F",
          }}
        />
      </div>
    </div>,
    OG_SIZE
  );
}

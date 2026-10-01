// components/shared/TechChip.tsx
// A stack item as a chip with its real brand mark (DESIGN-SYSTEM §6: real
// marks, not generic icons) when there is one; otherwise just the name.
// The names come from data (System.techStack); the marks are a lookup of
// well-known products, so a new technology simply shows as text.

import {
  SiAnthropic,
  SiDjango,
  SiDocker,
  SiExpress,
  SiFastapi,
  SiFirebase,
  SiFlutter,
  SiGraphql,
  SiJavascript,
  SiLaravel,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiPhp,
  SiPostgresql,
  SiPrisma,
  SiPython,
  SiReact,
  SiRedis,
  SiShadcnui,
  SiStripe,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";
import { cn } from "@/lib/utils";

const ICONS = {
  anthropic: SiAnthropic,
  claude: SiAnthropic,
  django: SiDjango,
  docker: SiDocker,
  express: SiExpress,
  fastapi: SiFastapi,
  firebase: SiFirebase,
  flutter: SiFlutter,
  graphql: SiGraphql,
  javascript: SiJavascript,
  laravel: SiLaravel,
  mongodb: SiMongodb,
  mysql: SiMysql,
  "next.js": SiNextdotjs,
  nextjs: SiNextdotjs,
  "node.js": SiNodedotjs,
  nodejs: SiNodedotjs,
  php: SiPhp,
  postgres: SiPostgresql,
  postgresql: SiPostgresql,
  prisma: SiPrisma,
  python: SiPython,
  react: SiReact,
  redis: SiRedis,
  "shadcn/ui": SiShadcnui,
  stripe: SiStripe,
  supabase: SiSupabase,
  tailwind: SiTailwindcss,
  "tailwind css": SiTailwindcss,
  tailwindcss: SiTailwindcss,
  typescript: SiTypescript,
  vercel: SiVercel,
} as const;

const MARK_CLASS = "size-3.5 shrink-0";

/** The brand mark for a technology, as an element, or null when there is no known mark. */
export function techMark(name: string): React.ReactNode {
  const Icon = (ICONS as Record<string, (typeof ICONS)[keyof typeof ICONS]>)[name.trim().toLowerCase()];
  return Icon ? <Icon aria-hidden="true" className={MARK_CLASS} /> : null;
}

export function TechChip({ name, tone = "light", className }: { name: string; tone?: "light" | "dark"; className?: string }) {
  const mark = techMark(name);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        tone === "dark" ? "border-white/10 bg-white/5 text-mist" : "border-ink/10 bg-paper text-slate",
        className,
      )}
    >
      {mark}
      {name}
    </span>
  );
}

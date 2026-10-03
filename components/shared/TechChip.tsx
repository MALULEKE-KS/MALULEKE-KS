// components/shared/TechChip.tsx
// A stack item as a chip with its real brand mark (DESIGN-SYSTEM §6: real
// marks, not generic icons) when there is one; otherwise just the name.
// The names come from data (System.techStack); the marks are a lookup of
// well-known products, so a new technology simply shows as text.

import type { IconType } from "react-icons";
import {
  SiAngular,
  SiAnthropic,
  SiBetterstack,
  SiCisco,
  SiCplusplus,
  SiCss,
  SiDjango,
  SiDocker,
  SiEslint,
  SiExpress,
  SiFastapi,
  SiFigma,
  SiFirebase,
  SiFlutter,
  SiGithub,
  SiGithubactions,
  SiGnubash,
  SiGraphql,
  SiHtml5,
  SiHuggingface,
  SiJavascript,
  SiJest,
  SiKeras,
  SiLangchain,
  SiLaravel,
  SiLucide,
  SiMongodb,
  SiMysql,
  SiNeon,
  SiNextdotjs,
  SiNodedotjs,
  SiNumpy,
  SiOpencv,
  SiOpenjdk,
  SiPandas,
  SiPhp,
  SiPlotly,
  SiPostgresql,
  SiPrisma,
  SiPrometheus,
  SiPydantic,
  SiPython,
  SiPytorch,
  SiRadixui,
  SiRailway,
  SiReact,
  SiReacthookform,
  SiReactivex,
  SiReactquery,
  SiRedis,
  SiScikitlearn,
  SiSentry,
  SiShadcnui,
  SiSharp,
  SiSqlalchemy,
  SiStripe,
  SiSupabase,
  SiTailwindcss,
  SiTensorflow,
  SiTestinglibrary,
  SiTypescript,
  SiUltralytics,
  SiVercel,
  SiVitest,
  SiZod,
} from "react-icons/si";
import { Database, Network, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The one map of brand marks on the site — chips, the system map, the About
// skills orbit (components/about/skill-icons.tsx reads it). Keys are lower case.
const ICONS: Record<string, IconType> = {
  angular: SiAngular,
  anthropic: SiAnthropic,
  claude: SiAnthropic,
  "better stack": SiBetterstack,
  "cisco packet tracer": SiCisco,
  "c++": SiCplusplus,
  css: SiCss,
  django: SiDjango,
  eslint: SiEslint,
  figma: SiFigma,
  docker: SiDocker,
  dockerfile: SiDocker,
  express: SiExpress,
  fastapi: SiFastapi,
  firebase: SiFirebase,
  flutter: SiFlutter,
  github: SiGithub,
  "github actions": SiGithubactions,
  graphql: SiGraphql,
  html: SiHtml5,
  "hugging face transformers": SiHuggingface,
  java: SiOpenjdk,
  javascript: SiJavascript,
  jest: SiJest,
  keras: SiKeras,
  langchain: SiLangchain,
  laravel: SiLaravel,
  lucide: SiLucide,
  mongodb: SiMongodb,
  mysql: SiMysql,
  neon: SiNeon,
  "next.js": SiNextdotjs,
  nextjs: SiNextdotjs,
  "node.js": SiNodedotjs,
  nodejs: SiNodedotjs,
  numpy: SiNumpy,
  opencv: SiOpencv,
  pandas: SiPandas,
  php: SiPhp,
  plotly: SiPlotly,
  postgres: SiPostgresql,
  postgresql: SiPostgresql,
  plpgsql: SiPostgresql,
  prisma: SiPrisma,
  prometheus: SiPrometheus,
  pydantic: SiPydantic,
  python: SiPython,
  pytorch: SiPytorch,
  "radix ui": SiRadixui,
  railway: SiRailway,
  react: SiReact,
  "react hook form": SiReacthookform,
  "react testing library": SiTestinglibrary,
  redis: SiRedis,
  rxjs: SiReactivex,
  "scikit-learn": SiScikitlearn,
  sentry: SiSentry,
  shell: SiGnubash,
  "shadcn/ui": SiShadcnui,
  sharp: SiSharp,
  sqlalchemy: SiSqlalchemy,
  stripe: SiStripe,
  supabase: SiSupabase,
  tailwind: SiTailwindcss,
  "tailwind css": SiTailwindcss,
  tailwindcss: SiTailwindcss,
  "tanstack query": SiReactquery,
  tensorflow: SiTensorflow,
  typescript: SiTypescript,
  vercel: SiVercel,
  "vercel ai sdk": SiVercel,
  "vercel ai gateway": SiVercel,
  vitest: SiVitest,
  yolov8: SiUltralytics,
  zod: SiZod,
};

/**
 * Official marks Simple Icons doesn't carry, vendored in public/brands (from
 * each project's own repo or svgl.app; recorded in PUBLIC-REDESIGN-PLAN §7a).
 * Drawn as a mask in the current colour, so they match the icons above.
 */
const MASKS: Record<string, string> = {
  "21st.dev": "/brands/21st.svg",
  chromadb: "/brands/chroma.svg",
  chroma: "/brands/chroma.svg",
  inngest: "/brands/inngest.svg",
  "magic ui": "/brands/magicui.svg",
  magicui: "/brands/magicui.svg",
  matlab: "/brands/matlab.svg",
  matplotlib: "/brands/matplotlib.svg",
  motion: "/brands/motion.svg",
  "framer motion": "/brands/motion.svg",
  networkx: "/brands/networkx.svg",
  playwright: "/brands/playwright.svg",
  tkinter: "/brands/tk.svg",
  tcl: "/brands/tk.svg",
};

/**
 * Concepts, not products — no brand to show, so an honest icon of the idea
 * instead of someone else's logo.
 */
const CONCEPTS: Record<string, LucideIcon> = {
  sql: Database,
  vlans: Network,
  vlan: Network,
};

/** The brand mark's component for a technology, or null when there is no known mark. */
function brandIcon(name: string): IconType | LucideIcon | null {
  const key = name.trim().toLowerCase();
  return ICONS[key] ?? CONCEPTS[key] ?? null;
}

/** The brand mark as an element at any size, or null — for callers outside a chip. */
export function brandMark(name: string, className: string): React.ReactNode {
  const mask = MASKS[name.trim().toLowerCase()];
  if (mask) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]", className)}
        style={{ maskImage: `url(${mask})`, WebkitMaskImage: `url(${mask})` }}
      />
    );
  }
  const Icon = brandIcon(name);
  return Icon ? <Icon aria-hidden="true" className={className} /> : null;
}

const MARK_CLASS = "size-3.5 shrink-0";

/** The brand mark for a technology, as an element, or null when there is no known mark. */
export function techMark(name: string): React.ReactNode {
  return brandMark(name, MARK_CLASS);
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

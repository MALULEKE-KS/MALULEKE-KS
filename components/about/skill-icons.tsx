// components/about/skill-icons.tsx
// A skill's brand mark, by the skill's name (data). Presentation only — like
// SocialLinks' brand icons: the marks are bundled (react-icons, no CDN), and a
// skill without a mark gets a clean monogram, so a new skill never needs code.

import type { IconType } from "react-icons";
import {
  SiAngular,
  SiCplusplus,
  SiDocker,
  SiExpress,
  SiFastapi,
  SiGithubactions,
  SiHuggingface,
  SiJavascript,
  SiJest,
  SiLangchain,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiNumpy,
  SiOpencv,
  SiOpenjdk,
  SiPostgresql,
  SiPrisma,
  SiPrometheus,
  SiPydantic,
  SiPython,
  SiPytorch,
  SiRailway,
  SiReact,
  SiReacthookform,
  SiReactquery,
  SiRedis,
  SiScikitlearn,
  SiSentry,
  SiShadcnui,
  SiTailwindcss,
  SiTestinglibrary,
  SiTypescript,
  SiUltralytics,
  SiVercel,
  SiVitest,
  SiZod,
} from "react-icons/si";
import { cn } from "@/lib/utils";

const ICONS: Record<string, IconType> = {
  angular: SiAngular,
  "c++": SiCplusplus,
  docker: SiDocker,
  express: SiExpress,
  fastapi: SiFastapi,
  "github actions": SiGithubactions,
  "hugging face transformers": SiHuggingface,
  javascript: SiJavascript,
  jest: SiJest,
  langchain: SiLangchain,
  mongodb: SiMongodb,
  "next.js": SiNextdotjs,
  "node.js": SiNodedotjs,
  numpy: SiNumpy,
  opencv: SiOpencv,
  java: SiOpenjdk,
  postgresql: SiPostgresql,
  prisma: SiPrisma,
  prometheus: SiPrometheus,
  pydantic: SiPydantic,
  python: SiPython,
  pytorch: SiPytorch,
  railway: SiRailway,
  react: SiReact,
  "react hook form": SiReacthookform,
  "tanstack query": SiReactquery,
  redis: SiRedis,
  "scikit-learn": SiScikitlearn,
  sentry: SiSentry,
  "shadcn/ui": SiShadcnui,
  "tailwind css": SiTailwindcss,
  "react testing library": SiTestinglibrary,
  typescript: SiTypescript,
  yolov8: SiUltralytics,
  vercel: SiVercel,
  vitest: SiVitest,
  zod: SiZod,
};

/** The skill's mark, or its initials when it has none. */
export function SkillIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name.toLowerCase()];
  if (Icon) return <Icon aria-hidden="true" className={cn("size-5", className)} />;
  const initials = name
    .replace(/[^A-Za-z0-9+ ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span aria-hidden="true" className={cn("font-mono text-[11px] font-semibold", className)}>
      {initials || "•"}
    </span>
  );
}

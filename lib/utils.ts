// lib/utils.ts
// Standard shadcn/ui class-merging helper — every component installed via
// the shadcn CLI imports this. Not business logic, purely a Tailwind
// class-conflict resolver (clsx + tailwind-merge).

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

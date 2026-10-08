// lib/guide/trail.ts
// The working trail (docs/AI-GUIDE-PHASE1-PLAN.md §5): what the guide really
// did for an answer, step by step — built only from the message's own parts
// (its reasoning and each tool call, with their real states). No step exists
// unless the part does; nothing runs on a timer.

import type { UIMessage } from "ai";

export type StepKind = "think" | "search" | "systems" | "journey" | "skills" | "pulse" | "navigate" | "compose";
export type StepState = "running" | "done" | "error";

export interface TrailStep {
  key: string;
  kind: StepKind;
  state: StepState;
  label: string;
  /** What the step found, when there's something to open. */
  links?: { label: string; href: string }[];
}

type Part = UIMessage["parts"][number] & { state?: string; input?: unknown; output?: unknown; toolCallId?: string };

const quote = (s: unknown) => (typeof s === "string" && s.trim() ? `“${s.trim().slice(0, 40)}”` : "");
const list = (names: string[]) => (names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`);
const toolState = (s: string | undefined): StepState => (s === "output-available" ? "done" : s === "output-error" ? "error" : "running");

export function trailOf(message: UIMessage): TrailStep[] {
  const steps: TrailStep[] = [];
  message.parts.forEach((raw, i) => {
    const p = raw as Part;
    const key = p.toolCallId ?? `${p.type}-${i}`;
    const input = (p.input ?? {}) as Record<string, unknown>;
    switch (p.type) {
      case "reasoning": {
        if (!("text" in p) || !String(p.text).trim()) return;
        const state: StepState = p.state === "streaming" ? "running" : "done";
        steps.push({ key, kind: "think", state, label: state === "running" ? "Thinking it through" : "Thought it through" });
        return;
      }
      case "tool-search_systems": {
        const state = toolState(p.state);
        const found = Array.isArray(p.output) ? (p.output as { title?: string; path?: string }[]) : [];
        steps.push({
          key,
          kind: "search",
          state,
          label: state === "running" ? `Searching the site ${quote(input.query)}`.trim() : state === "error" ? "The search didn't work" : `Searched ${quote(input.query)} · ${found.length} found`,
          links: found.filter((r) => r.title && r.path).map((r) => ({ label: r.title!, href: r.path! })),
        });
        return;
      }
      case "tool-show_systems": {
        const state = toolState(p.state);
        const cards = Array.isArray(p.output) ? (p.output as { name: string; href: string }[]) : [];
        steps.push({
          key,
          kind: "systems",
          state,
          label: state === "running" ? "Looking up the systems" : state === "error" ? "Couldn't look up the systems" : cards.length ? `Read ${list(cards.map((c) => c.name))}` : "Looked up the systems · none found",
          links: cards.map((c) => ({ label: c.name, href: c.href })),
        });
        return;
      }
      case "tool-show_journey": {
        const state = toolState(p.state);
        const out = p.output as { from: number; to: number; moments: unknown[] } | null | undefined;
        const span = typeof input.from === "number" && typeof input.to === "number" ? (input.from === input.to ? ` ${input.from}` : ` ${input.from}–${input.to}`) : "";
        steps.push({
          key,
          kind: "journey",
          state,
          label: state === "running" ? `Reading the journey${span}` : state === "error" ? "Couldn't read the journey" : out ? `Read the journey${span} · ${out.moments.length} moments` : `Nothing on the journey${span}`,
        });
        return;
      }
      case "tool-show_skills": {
        const state = toolState(p.state);
        const cards = Array.isArray(p.output) ? (p.output as { name: string }[]) : [];
        steps.push({
          key,
          kind: "skills",
          state,
          label: state === "running" ? "Checking the skills" : state === "error" ? "Couldn't check the skills" : cards.length ? `Checked ${list(cards.map((c) => c.name))}` : "Checked the skills · none found",
        });
        return;
      }
      case "tool-show_pulse": {
        const state = toolState(p.state);
        steps.push({ key, kind: "pulse", state, label: state === "running" ? "Reading the site's pulse" : state === "error" ? "Couldn't read the pulse" : "Read the site's live pulse" });
        return;
      }
      case "tool-open_page": {
        const state = toolState(p.state);
        const path = typeof input.path === "string" ? input.path : "";
        steps.push({ key, kind: "navigate", state, label: state === "running" ? `Opening ${path || "a page"}` : state === "error" ? "Couldn't open that page" : `Opened ${path}`, links: path ? [{ label: path, href: path }] : [] });
        return;
      }
      case "tool-draft_inquiry": {
        const state = toolState(p.state);
        steps.push({ key, kind: "compose", state, label: state === "running" ? "Drafting your message" : state === "error" ? "Couldn't draft the message" : "Drafted your message — review it and send it yourself" });
        return;
      }
    }
  });
  return steps;
}

/** What the guide is doing right now, for the character's caption — the newest running step, or thinking. */
export function currentActivity(message: UIMessage | undefined): TrailStep | null {
  if (!message || message.role !== "assistant") return null;
  const running = trailOf(message).filter((s) => s.state === "running");
  return running[running.length - 1] ?? null;
}

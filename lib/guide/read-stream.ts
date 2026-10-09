// lib/guide/read-stream.ts
// Reads the guide's answer out of its UI message stream (server-sent events):
// the words, the tools it ran, and any error it reported. Used by the daily
// canary and the eval suite — anything that asks the real route.

export interface GuideAnswer {
  text: string;
  /** Names of the tools the model called, in order. */
  tools: string[];
  /** The stream's error text, when it ended in one (e.g. the busy message). */
  error: string | null;
}

export async function readGuideStream(res: Response): Promise<GuideAnswer> {
  const out: GuideAnswer = { text: "", tools: [], error: null };
  for (const line of (await res.text()).split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const part = JSON.parse(line.slice(6)) as { type?: string; delta?: string; toolName?: string; errorText?: string };
      if (part.type === "text-delta" && part.delta) out.text += part.delta;
      else if (part.type === "tool-input-available" && part.toolName) out.tools.push(part.toolName);
      else if (part.type === "error") out.error = part.errorText ?? "error";
    } catch {
      // [DONE] and non-JSON lines.
    }
  }
  return out;
}

// lib/guide/first-token.ts
// A first-word deadline for the guide's model (docs/AI-GUIDE-PHASE2-PLAN.md §3 A4).
// The gateway falls back to the next model when one *fails*; it does not when one
// is alive but silent, so a stalled model holds the visitor until the function's
// own limit. This middleware watches the first words: if the model hasn't said
// anything within the deadline, it is dropped and the next model is asked —
// one after another, never in parallel, so a slow turn costs at most one more
// request (the free models allow about five a minute for the whole site; racing
// two at once would double that).
//
// What counts as "said something": the first piece of the answer or of its
// reasoning, or a tool call, or an error — not the stream merely opening.
// Off by default (a deadline of 0): without Guide health numbers to set it from,
// a wrong guess would drop a model that was about to answer.

import type { LanguageModelMiddleware } from "ai";

type StreamFn = NonNullable<LanguageModelMiddleware["wrapStream"]>;
type StreamArgs = Parameters<StreamFn>[0];
type StreamResult = Awaited<ReturnType<StreamArgs["doStream"]>>;
type Part = StreamResult["stream"] extends ReadableStream<infer P> ? P : never;
type FallbackModel = StreamArgs["model"];

const SPEAKING = new Set(["text-delta", "reasoning-delta", "tool-input-start", "tool-input-delta", "tool-call", "error", "finish"]);

/** Does this stream part mean the model has started answering (or has ended / failed — either way it is not silent)? */
export function isSpeaking(part: { type: string; delta?: string }): boolean {
  if (!SPEAKING.has(part.type)) return false;
  // An empty text delta is a model clearing its throat.
  return !((part.type === "text-delta" || part.type === "reasoning-delta") && !part.delta);
}

const TIMED_OUT = Symbol("timed out");

/** Read parts into `buffer` until one is speaking (done), the stream ends (ended) or `ms` passes (timeout). */
async function readUntilSpeaking(reader: ReadableStreamDefaultReader<Part>, buffer: Part[], ms: number): Promise<"speaking" | "ended" | "timeout"> {
  const deadline = Date.now() + ms;
  for (;;) {
    const left = deadline - Date.now();
    if (left <= 0) return "timeout";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = await Promise.race([reader.read(), new Promise<typeof TIMED_OUT>((resolve) => (timer = setTimeout(() => resolve(TIMED_OUT), left)))]);
    clearTimeout(timer);
    if (next === TIMED_OUT) return "timeout";
    if (next.done) return "ended";
    buffer.push(next.value);
    if (isSpeaking(next.value as { type: string; delta?: string })) return "speaking";
  }
}

/** The buffered parts followed by the rest of the original stream — nothing lost, nothing reordered. */
function replay(reader: ReadableStreamDefaultReader<Part>, buffer: Part[]): ReadableStream<Part> {
  let i = 0;
  return new ReadableStream<Part>({
    async pull(controller) {
      if (i < buffer.length) {
        controller.enqueue(buffer[i++]!);
        return;
      }
      const next = await reader.read();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
    cancel: (reason) => reader.cancel(reason),
  });
}

export interface FirstTokenDeadline {
  /** Milliseconds a model has to start answering; 0 = no deadline. */
  deadlineMs: number;
  /** Models to try, in order, when one stays silent past the deadline. */
  fallbacks: FallbackModel[];
}

export function firstTokenDeadline({ deadlineMs, fallbacks }: FirstTokenDeadline): LanguageModelMiddleware {
  return {
    specificationVersion: "v4",
    wrapStream: async ({ doStream, params }) => {
      if (deadlineMs <= 0 || fallbacks.length === 0) return doStream();

      const attempts: (() => Promise<StreamResult>)[] = [async () => await doStream(), ...fallbacks.map((m) => async () => (await m.doStream(params)) as StreamResult)];
      for (const [i, attempt] of attempts.entries()) {
        const last = i === attempts.length - 1;
        const result = await attempt();
        if (last) return result;
        if (params.abortSignal?.aborted) return result;

        const reader = result.stream.getReader();
        const buffer: Part[] = [];
        const outcome = await readUntilSpeaking(reader, buffer, deadlineMs);
        if (outcome !== "timeout") return { ...result, stream: replay(reader, buffer) };
        // Silent past the deadline: let it go and ask the next one.
        void reader.cancel("no first word before the deadline").catch(() => {});
      }
      // Unreachable: the last attempt returns above.
      return doStream();
    },
  };
}

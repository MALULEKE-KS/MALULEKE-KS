// tests/unit/guide-chat-lazy.test.tsx
// The guide's chat engine loads after the first view (WP-102): nothing of it runs for a
// visitor who only reads, it arrives on the first sign of use, and a question asked in the
// gap is held and sent. The engine itself is stubbed — this is about when and how it comes.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { GuideChat, GuideChatStore, HeldQuestion } from "@/components/guide/chat-types";

const guide = vi.hoisted(() => ({ open: false, pending: null as string | null, setLens: vi.fn() }));
const engine = vi.hoisted(() => ({ mounts: 0, sent: [] as string[] }));

vi.mock("next/navigation", () => ({ usePathname: () => "/systems", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/guide/GuideProvider", () => ({ useGuide: () => guide }));
vi.mock("next/dynamic", async () => {
  const React = await import("react");
  function StubEngine({ store, held }: { store: GuideChatStore; held: HeldQuestion }) {
    React.useEffect(() => {
      engine.mounts += 1;
      const first = held.take();
      if (first) engine.sent.push(first);
      store.set({ ...store.get(), status: "streaming", busy: true, messages: [{ id: "a", role: "assistant", parts: [{ type: "text", text: "hello" }] }] } as GuideChat);
    }, [store, held]);
    return null;
  }
  return { default: () => StubEngine };
});

import { GuideChatProvider, useGuideChat } from "@/components/guide/GuideChatProvider";

const SITE = { systems: [], pages: [] } as never;

function Probe() {
  const chat = useGuideChat();
  return (
    <div>
      <p data-testid="state">{`${chat.status}|${chat.messages.length}|${chat.opening.join(",")}`}</p>
      <button onClick={() => chat.send("  who is he?  ")}>ask</button>
    </div>
  );
}

const mount = () =>
  render(
    <GuideChatProvider maxQuestionCharacters={500} suggestions={["What did he build?", "Is he a fit?"]} siteIndex={SITE}>
      <Probe />
    </GuideChatProvider>,
  );

beforeEach(() => {
  guide.open = false;
  guide.pending = null;
  engine.mounts = 0;
  engine.sent = [];
  sessionStorage.clear();
});
afterEach(cleanup);

describe("GuideChatProvider — the chat engine arrives after the first view", () => {
  it("shows an empty, ready conversation with the opening questions and loads nothing", () => {
    mount();
    expect(screen.getByTestId("state").textContent).toBe("ready|0|What did he build?,Is he a fit?");
    expect(engine.mounts).toBe(0);
  });

  it("loads the engine on the first sign of use, and shows what it publishes", async () => {
    mount();
    await act(async () => void window.dispatchEvent(new Event("pointerdown")));
    expect(engine.mounts).toBe(1);
    expect(screen.getByTestId("state").textContent).toMatch(/^streaming\|1\|/);
  });

  it("loads the engine when the panel opens, and when the page hands over a question", async () => {
    guide.open = true;
    mount();
    await act(async () => {});
    expect(engine.mounts).toBe(1);
    cleanup();
    engine.mounts = 0;
    guide.open = false;
    guide.pending = "What is this site?";
    mount();
    await act(async () => {});
    expect(engine.mounts).toBe(1);
  });

  it("brings back a conversation saved in this tab at once", async () => {
    sessionStorage.setItem("mks.guide.chat", "[]");
    mount();
    await act(async () => {});
    expect(engine.mounts).toBe(1);
  });

  it("holds a question asked before the engine arrived and hands it over, trimmed", async () => {
    mount();
    await act(async () => void screen.getByText("ask").click());
    expect(engine.mounts).toBe(1);
    expect(engine.sent).toEqual(["who is he?"]);
  });

  it("shows the guide as already working while a held question waits for the engine", async () => {
    mount();
    // The stub engine would publish at once; hold the click before it can by reading right after.
    act(() => void screen.getByText("ask").click());
    expect(screen.getByTestId("state").textContent).toMatch(/^(submitted|streaming)\|/);
  });
});

// tests/unit/guide-answer-feedback.test.tsx
// The buttons under an answer (docs/AI-GUIDE-PHASE2-PLAN.md §7): every word is the
// owner's and each feature appears only when its wording is written.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnswerTools } from "@/components/guide/console/AnswerFeedback";

let tools: AnswerTools | null = null;
const send = vi.fn();
vi.mock("@/components/guide/GuideChatProvider", () => ({ useGuideChat: () => ({ answerTools: tools, send, busy: false }) }));

import { AnswerFeedback } from "@/components/guide/console/AnswerFeedback";

const FULL: AnswerTools = { feedbackHelpful: "Helpful", feedbackWrong: "This was wrong", feedbackThanks: "Thanks — noted.", challengeLabel: "Challenge this", challengePrompt: "Challenge your last answer." };

beforeEach(() => {
  send.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AnswerFeedback", () => {
  it("shows nothing until the owner has written some wording", () => {
    tools = null;
    expect(render(<AnswerFeedback question="q" answer="a" />).container.innerHTML).toBe("");
    tools = {};
    expect(render(<AnswerFeedback question="q" answer="a" />).container.innerHTML).toBe("");
  });

  it("shows the owner's words for each feature — and only the features that have them", () => {
    tools = { challengeLabel: "Challenge this", challengePrompt: "Challenge your last answer." };
    render(<AnswerFeedback question="q" answer="a" />);
    expect(screen.getByText("Challenge this")).toBeTruthy();
    expect(screen.queryByText("Helpful")).toBeNull();
  });

  it("sends the rating with the question and the answer, then thanks in the owner's words", async () => {
    tools = FULL;
    render(<AnswerFeedback question="Does he know Fortran?" answer="No record of it." />);
    fireEvent.click(screen.getByText("This was wrong"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Thanks — noted."));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("/api/v1/guide/feedback");
    expect(JSON.parse(init.body)).toMatchObject({ rating: "wrong", question: "Does he know Fortran?", answer: "No record of it." });
  });

  it("challenges by asking the guide the owner's question", () => {
    tools = FULL;
    render(<AnswerFeedback question="q" answer="a" />);
    fireEvent.click(screen.getByText("Challenge this"));
    expect(send).toHaveBeenCalledWith("Challenge your last answer.");
  });

  it("keeps the buttons when sending fails, so the visitor can try again", async () => {
    tools = FULL;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    render(<AnswerFeedback question="q" answer="a" />);
    fireEvent.click(screen.getByText("Helpful"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Helpful")).toBeTruthy();
  });
});

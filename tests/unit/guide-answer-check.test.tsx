// tests/unit/guide-answer-check.test.tsx
// What a visitor sees of the verifier (docs/AI-GUIDE-PHASE2-PLAN.md §4 B2): what was
// checked, and — plainly — what could not be found in the site's data.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AnswerCheck } from "@/components/guide/console/AnswerCheck";

afterEach(cleanup);

describe("AnswerCheck", () => {
  it("shows nothing when nothing was checked or there is no verification", () => {
    const { container, rerender } = render(<AnswerCheck verification={undefined} />);
    expect(container.innerHTML).toBe("");
    rerender(<AnswerCheck verification={{ checked: 0, flagged: [] }} />);
    expect(container.innerHTML).toBe("");
  });

  it("says how many facts were checked when all were found", () => {
    render(<AnswerCheck verification={{ checked: 7, flagged: [] }} />);
    expect(screen.getByText(/7 facts checked against the site's data/)).toBeTruthy();
  });

  it("says 'fact' for one", () => {
    render(<AnswerCheck verification={{ checked: 1, flagged: [] }} />);
    expect(screen.getByText(/1 fact checked/)).toBeTruthy();
  });

  it("names what could not be found, as a note, without calling the answer false", () => {
    render(
      <AnswerCheck
        verification={{
          checked: 4,
          flagged: [
            { kind: "technology", text: "Kubernetes" },
            { kind: "number", text: "9 systems" },
          ],
        }}
      />,
    );
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("Couldn't find in the site's data: Kubernetes, 9 systems");
    expect(note.textContent).toContain("Treat them with care");
    expect(note.textContent).not.toMatch(/false|wrong|lie/i);
  });

  it("speaks of a single flagged claim in the singular", () => {
    render(<AnswerCheck verification={{ checked: 2, flagged: [{ kind: "year", text: "2021" }] }} />);
    expect(screen.getByRole("note").textContent).toContain("Treat it with care");
  });
});

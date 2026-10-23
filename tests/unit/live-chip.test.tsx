// tests/unit/live-chip.test.tsx
// The header's live chip (D-058): it says what the platform's own data says —
// the build that is running on production, "Preview" on a preview build,
// nothing locally — and opens the vital signs, every line the owner's words.

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LiveChip, type HeaderPulse } from "@/components/shared/LiveChip";

const labels = {
  liveLabel: "Live",
  previewLabel: "Preview",
  vitalsTitle: "The platform, right now",
  vitalsBuild: "Build running",
  vitalsSync: "Synced with GitHub",
  vitalsRules: "Rules the database enforces",
  vitalsAudited: "Changes audited, 7 days",
  vitalsLink: "How it's built",
};
const pulse: HeaderPulse = { commit: "23897d1", environment: "production", lastGithubSyncAt: new Date(Date.now() - 3 * 3_600_000).toISOString(), rulesEnforcedByDatabase: 41, auditEventsLast7Days: 1135 };

describe("LiveChip", () => {
  it("shows the build that is running on production, and opens its vital signs", () => {
    render(<LiveChip pulse={pulse} labels={labels} link="/systems/maluleke-ks" />);
    const chip = screen.getByRole("button", { name: /Live · 23897d1/ });
    fireEvent.click(chip);
    const card = screen.getByRole("dialog", { name: "The platform, right now" });
    expect(card.textContent).toContain("41");
    expect(card.textContent).toMatch(/1[\s ,]?135/); // en-ZA groups thousands with a space
    expect(card.textContent).toContain("3 h ago");
    expect(screen.getByRole("link", { name: /How it's built/ }).getAttribute("href")).toBe("/systems/maluleke-ks");
  });

  it("says Preview on a preview build, and nothing without a build", () => {
    const { rerender, container } = render(<LiveChip pulse={{ ...pulse, environment: "preview" }} labels={labels} link={null} />);
    expect(screen.getByRole("button", { name: /Preview/ })).toBeTruthy();
    rerender(<LiveChip pulse={null} labels={labels} link={null} />);
    expect(container.textContent).toBe("");
  });

  it("hides the chip when its label is left empty", () => {
    const { container } = render(<LiveChip pulse={pulse} labels={{ ...labels, liveLabel: "" }} link={null} />);
    expect(container.textContent).toBe("");
  });
});

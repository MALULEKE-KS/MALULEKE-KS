// tests/unit/display-name.test.ts
// F5c — the readable name the GitHub sync suggests for a new repository.

import { describe, expect, it } from "vitest";
import { displayNameFromRepo } from "@/lib/jobs/github-sync";

describe("displayNameFromRepo", () => {
  it("turns separators into spaces and capitalises each word", () => {
    expect(displayNameFromRepo("graph-search-engine")).toBe("Graph Search Engine");
    expect(displayNameFromRepo("machine_learning_project")).toBe("Machine Learning Project");
    expect(displayNameFromRepo("fundslink-Academy")).toBe("Fundslink Academy");
    expect(displayNameFromRepo("Xkimi-Xa-Mali")).toBe("Xkimi Xa Mali");
  });

  it("keeps an all-caps name and all-caps words as they are", () => {
    expect(displayNameFromRepo("MALULEKE-KS")).toBe("MALULEKE-KS");
    expect(displayNameFromRepo("osi-TCPIP-visualizer")).toBe("Osi TCPIP Visualizer");
  });

  it("keeps a single plain word readable", () => {
    expect(displayNameFromRepo("governova")).toBe("Governova");
  });
});

// tests/unit/guide-text.test.tsx
// The guide's answers render as text, never markup — whatever the model (or
// a forged history) says. Site paths become links; nothing else does.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GuideText } from "@/components/guide/GuideText";

function links(container: HTMLElement) {
  return [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
}

describe("GuideText", () => {
  it("renders HTML and script as plain text", () => {
    const { container } = render(<GuideText text={`<img src=x onerror=alert(1)> <script>alert(1)</script> <a href="https://evil.example">x</a>`} />);
    expect(container.querySelector("img, script")).toBeNull();
    expect(links(container)).toEqual([]);
    expect(container.textContent).toContain("<script>");
  });

  it("links the site's own paths — the answer's sources", () => {
    const { container } = render(<GuideText text="He built it (see /systems/xkimi-xa-mali). The CV is at /cv." />);
    expect(links(container)).toEqual(["/systems/xkimi-xa-mali", "/cv"]);
  });

  it.each([
    "//evil.example/phish",
    "javascript:alert(1)",
    "https://evil.example/systems",
    "and/or 24/7 PDF/DOCX",
    "a / b",
    "file:///etc/passwd",
  ])("does not link %s", (text) => {
    const { container } = render(<GuideText text={text} />);
    expect(links(container)).toEqual([]);
  });

  it("links GitHub and the owner's own profiles, opening safely in a new tab", () => {
    const { container } = render(
      <GuideText hosts={["github.com", "linkedin.com"]} text="See https://github.com/KSDRILL-SA/Xkimi-Xa-Mali. Or https://www.linkedin.com/in/someone" />,
    );
    const anchors = [...container.querySelectorAll("a")];
    expect(anchors.map((a) => a.getAttribute("href"))).toEqual(["https://github.com/KSDRILL-SA/Xkimi-Xa-Mali", "https://www.linkedin.com/in/someone"]);
    for (const a of anchors) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
  });

  it.each(["https://evil.example/login", "https://github.com.evil.example/x", "http://github.com/plain-http", "https://notgithub.com/x"])(
    "does not link %s outside the allow-list",
    (url) => {
      const { container } = render(<GuideText hosts={["github.com"]} text={`Visit ${url} now`} />);
      expect(links(container)).toEqual([]);
      expect(container.textContent).toContain(url);
    },
  );

  it("renders bullets and bold without the markers", () => {
    const { container } = render(<GuideText text={"**Stack**\n\n- Next.js\n- Postgres"} />);
    expect(container.querySelector("strong")?.textContent).toBe("Stack");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("**");
  });
});

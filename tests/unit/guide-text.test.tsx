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

  it("links a section of a page", () => {
    const { container } = render(<GuideText text="His principles are at /about#method." />);
    expect(links(container)).toEqual(["/about#method"]);
  });

  it("renders [label](target) links only to allowed targets, showing just the label otherwise", () => {
    const { container } = render(
      <GuideText hosts={["github.com"]} text="See [the method](/about#method), [the repo](https://github.com/x/y), [click](javascript:alert(1)) and [login](https://evil.example/login)." />,
    );
    expect(links(container)).toEqual(["/about#method", "https://github.com/x/y"]);
    expect(container.textContent).toContain("click");
    expect(container.textContent).not.toContain("javascript:");
    expect(container.textContent).not.toContain("evil.example");
  });

  it("shows code exactly — nothing inside a code block or span is parsed", () => {
    const { container } = render(<GuideText text={"Try `SELECT 1` then:\n\n```sql\nSELECT * FROM \"System\"; -- /systems/x **not bold** <b>\n```"} />);
    expect(container.querySelector("p code")?.textContent).toBe("SELECT 1");
    const pre = container.querySelector("pre");
    expect(pre?.textContent).toContain('SELECT * FROM "System"; -- /systems/x **not bold** <b>');
    expect(pre?.querySelector("a, strong, b")).toBeNull();
    expect(container.textContent).toContain("sql");
  });

  it("shows an unclosed fence (mid-stream) as code so far", () => {
    const { container } = render(<GuideText text={"Here:\n\n```ts\nconst a = 1;"} />);
    expect(container.querySelector("pre")?.textContent).toContain("const a = 1;");
  });

  it("renders numbered steps, and a lead-in line above a list", () => {
    const { container } = render(<GuideText text={"Three steps:\n1. Schema\n2. Contract\n3. Code"} />);
    expect(container.querySelector("p")?.textContent).toBe("Three steps:");
    expect(container.querySelectorAll("ol li")).toHaveLength(3);
    expect(container.textContent).not.toMatch(/\d\.\s/);
  });

  it("renders bullets and bold without the markers", () => {
    const { container } = render(<GuideText text={"**Stack**\n\n- Next.js\n- Postgres"} />);
    expect(container.querySelector("strong")?.textContent).toBe("Stack");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("**");
  });
});

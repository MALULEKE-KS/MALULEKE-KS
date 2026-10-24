// tests/unit/inquiry-safe-display.test.ts
// LT-13 — safe display: a name, organisation or role can't be disguised with control, bidi or zero-width
// characters, and a document's name is a plain display name (no path, no tricks, .pdf kept).

import { describe, expect, it } from "vitest";
import { Contact, clean } from "@/lib/inquiries/forms";
import { safeFileName } from "@/lib/inquiries/documents";

const RLO = "\u202E", ZWSP = "\u200B", BOM = "\uFEFF", LRI = "\u2066", BELL = "\u0007";

describe("LT-13 safe display", () => {
  it("strips bidi overrides, zero-width and control characters", () => {
    expect(clean(`Ann${RLO}fdp.exe`)).toBe("Annfdp.exe");
    expect(clean(`Z${ZWSP}an${BOM}e${LRI}le${BELL}`)).toBe("Zanele");
    expect(clean("Thandiwe Mokoena")).toBe("Thandiwe Mokoena");
  });

  it("cleans the contact's name, organisation and role on submit", () => {
    const r = Contact.safeParse({ name: `Lerato${RLO} Dlamini`, email: "lerato@example.com", organization: `Acme${ZWSP} Ltd`, role: `CTO${BOM}`, preferredChannel: "email" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.name).toBe("Lerato Dlamini");
    expect(r.data.organization).toBe("Acme Ltd");
    expect(r.data.role).toBe("CTO");
  });

  it("gives a document a plain display name", () => {
    const BS = String.fromCharCode(92); // a Windows path separator
    expect(safeFileName(["C:", "Users", "x", "..", "secret", "CV.pdf"].join(BS))).toBe("CV.pdf");
    expect(safeFileName(`invoice${RLO}fdp.exe`)).toBe("invoicefdp.exe.pdf") // the reversal trick is gone; it is what it says, and a .pdf;
    expect(safeFileName("../../etc/passwd")).toBe("passwd.pdf");
    expect(safeFileName("...")).toBe("document.pdf");
    expect(safeFileName(`${"a".repeat(300)}.pdf`)).toHaveLength(114);
  });
});

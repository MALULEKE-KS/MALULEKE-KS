// tests/unit/notification-address.test.ts
// D-074: an email address is stored as one spelling, so a provider that matches it exactly (Resend's test sender
// delivers only to the account's own address as written) gets the address it knows.

import { describe, expect, it } from "vitest";
import { normalizeAddress } from "@/lib/notifications";

describe("email addresses", () => {
  it("are trimmed and lower-cased", () => {
    expect(normalizeAddress("  Kurhula04s@Gmail.com ")).toBe("kurhula04s@gmail.com");
    expect(normalizeAddress("owner@example.com")).toBe("owner@example.com");
  });
});

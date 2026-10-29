import { describe, expect, it } from "vitest";
import { buildWhatsAppShareUrl } from "./share";

describe("buildWhatsAppShareUrl", () => {
  it("encodes the answer and URL", () => {
    const url = buildWhatsAppShareUrl(
      "Passport fee: NPR 12,000",
      "https://index.example/services/passport",
    );
    expect(url).toContain("https://wa.me/?text=");
    expect(url).toContain(
      encodeURIComponent("https://index.example/services/passport"),
    );
  });
});

import { describe, expect, it } from "vitest";
import { parseCitizenChunk } from "./citizen";

describe("parseCitizenChunk", () => {
  it("parses sources", () => {
    expect(
      parseCitizenChunk(
        JSON.stringify({
          type: "sources",
          sources: [
            {
              id: 1,
              title: "Passport",
              url: "https://nepalpassport.gov.np/",
              service: "passport",
              last_checked: "2026-10-29",
              stale: false,
              needs_review: false,
            },
          ],
        }),
      ),
    ).toMatchObject({ type: "sources" });
  });

  it("parses meta and ignores malformed lines", () => {
    expect(
      parseCitizenChunk(
        JSON.stringify({
          type: "meta",
          meta: { verification: "verified", services: ["passport"] },
        }),
      ),
    ).toMatchObject({ type: "meta" });
    expect(parseCitizenChunk("not json")).toBeNull();
  });
});

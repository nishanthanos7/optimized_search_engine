import { describe, expect, it } from "vitest";
import { CITIZEN_SERVICES, getCitizenService } from "./services";

describe("CITIZEN_SERVICES", () => {
  it("has exactly five unique slugs matching the backend", () => {
    const slugs = CITIZEN_SERVICES.map((s) => s.slug);
    expect(slugs).toEqual([
      "passport",
      "driving-licence",
      "citizenship",
      "birth-registration",
      "marriage-registration",
    ]);
    expect(new Set(slugs).size).toBe(5);
  });

  it("looks up a service by slug", () => {
    const service = getCitizenService("passport");
    expect(service).toBeDefined();
    expect(service?.name).toBe("Passport");
    expect(getCitizenService("unknown")).toBeUndefined();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getCitizenService } from "@/lib/citizen/services";
import { ServicePageView } from "./service-page-view";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe("ServicePageView", () => {
  it("renders the service name, questions, and official source link", () => {
    const service = getCitizenService("passport")!;
    render(<ServicePageView service={service} />);
    expect(screen.getByRole("heading", { name: /passport/i })).toBeDefined();
    expect(screen.getByText(service.questions[0])).toBeDefined();
    expect(screen.getByRole("link", { name: /nepalpassport/i })).toBeDefined();
  });
});

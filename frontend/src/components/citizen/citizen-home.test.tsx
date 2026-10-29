import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CitizenHome } from "./citizen-home";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("CitizenHome", () => {
  it("renders the Nepal headline", () => {
    render(<CitizenHome />);
    expect(
      screen.getByRole("heading", {
        name: /Nepal.s government, explained/i,
      }),
    ).toBeDefined();
  });

  it("renders the five service chips", () => {
    render(<CitizenHome />);
    const serviceNames = [
      "Passport",
      "Driving licence",
      "Citizenship certificate",
      "Birth registration",
      "Marriage registration",
    ];
    for (const name of serviceNames) {
      expect(
        screen.getByRole("button", { name }),
        `Button "${name}" not found`,
      ).toBeDefined();
    }
  });

  it("renders the search bar with service aria-label", () => {
    render(<CitizenHome />);
    expect(
      screen.getByRole("combobox", {
        name: /Ask about a Nepal government service/i,
      }),
    ).toBeDefined();
  });
});

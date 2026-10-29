import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageToggle } from "./language-toggle";

describe("LanguageToggle", () => {
  it("defaults to Nepali and switches to English on click", () => {
    const onChange = vi.fn();
    render(<LanguageToggle value="ne" onChange={onChange} />);
    expect(screen.getByText("English")).toBeDefined();
    expect(screen.getByText("नेपाली")).toBeDefined();
    fireEvent.click(screen.getByText("English"));
    expect(onChange).toHaveBeenCalledWith("en");
  });
});

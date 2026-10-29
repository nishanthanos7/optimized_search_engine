import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamCitizenAnswer } from "@/lib/api";
import { useCitizenAnswer } from "./use-citizen-answer";

vi.mock("@/lib/api", () => ({
  streamCitizenAnswer: vi.fn(),
}));

const mockStreamCitizenAnswer = streamCitizenAnswer as unknown as ReturnType<typeof vi.fn>;

describe("useCitizenAnswer", () => {
  beforeEach(() => mockStreamCitizenAnswer.mockReset());

  it("collects text, sources, and meta", async () => {
    mockStreamCitizenAnswer.mockImplementation(async function* () {
      yield { type: "sources", sources: [] };
      yield { type: "text", content: "Hello" };
      yield {
        type: "meta",
        meta: {
          verification: "verified",
          services: [],
          language: "en",
          conflicts: [],
          stale: false,
          needs_review: false,
        },
      };
    });

    const { result } = renderHook(() =>
      useCitizenAnswer({
        query: "passport",
        service: "passport",
        language: "en",
      }),
    );

    expect(mockStreamCitizenAnswer).toHaveBeenCalledTimes(1);

    // Flush async generator microtask queue
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.answer).toBe("Hello");
    expect(result.current.meta?.verification).toBe("verified");
  });
});

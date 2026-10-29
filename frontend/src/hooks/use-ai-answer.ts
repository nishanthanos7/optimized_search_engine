"use client";

import { useCallback, useEffect, useState } from "react";
import { streamAiAnswer, type AiSource } from "@/lib/api";

export type AiStatus = "thinking" | "streaming" | "done" | "error";

export function useAiAnswer(query: string) {
  const [status, setStatus] = useState<AiStatus>("thinking");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AiSource[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      let receivedText = false;

      try {
        for await (const chunk of streamAiAnswer(query, controller.signal)) {
          if (controller.signal.aborted) break;

          if (chunk.type === "text") {
            receivedText = true;
            setStatus("streaming");
            setAnswer((previous) => previous + chunk.content);
          } else if (chunk.type === "sources") {
            setSources(chunk.sources ?? []);
          }
        }

        if (!controller.signal.aborted) {
          setStatus(receivedText ? "done" : "error");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [query, attempt]);

  const retry = useCallback(() => {
    setStatus("thinking");
    setAnswer("");
    setSources([]);
    setAttempt((value) => value + 1);
  }, []);

  return { status, answer, sources, retry };
}

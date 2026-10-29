"use client";

import { useCallback, useEffect, useState } from "react";
import {
  streamCitizenAnswer,
  type CitizenMeta,
  type CitizenSource,
} from "@/lib/api";

export type CitizenStatus = "thinking" | "streaming" | "done" | "error";

export function useCitizenAnswer({
  query,
  service,
  language = "ne",
}: {
  query: string;
  service?: string | null;
  language?: "ne" | "en";
}) {
  const [status, setStatus] = useState<CitizenStatus>("thinking");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<CitizenSource[]>([]);
  const [meta, setMeta] = useState<CitizenMeta | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    let receivedText = false;

    (async () => {
      try {
        for await (const chunk of streamCitizenAnswer(
          { query, service, language },
          controller.signal,
        )) {
          if (controller.signal.aborted) break;

          if (chunk.type === "text") {
            receivedText = true;
            setStatus("streaming");
            setAnswer((previous) => previous + chunk.content);
          } else if (chunk.type === "sources") {
            setSources(chunk.sources ?? []);
          } else if (chunk.type === "meta") {
            setMeta(chunk.meta);
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
  }, [query, service, language, attempt]);

  const retry = useCallback(() => {
    setStatus("thinking");
    setAnswer("");
    setSources([]);
    setMeta(null);
    setAttempt((value) => value + 1);
  }, []);

  return { status, answer, sources, meta, retry };
}

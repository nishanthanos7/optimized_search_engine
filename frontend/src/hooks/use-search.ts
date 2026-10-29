"use client";

import { useCallback, useEffect, useState } from "react";
import { search, type SearchResult } from "@/lib/api";

export function useSearch(query: string, page: number) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    search(query, page, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResults(data.results ?? []);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if ((err as Error)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, page, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError("");
    setResults([]);
    setAttempt((value) => value + 1);
  }, []);

  return { results, loading, error, retry };
}

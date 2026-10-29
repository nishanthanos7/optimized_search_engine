"use client";

import { useEffect, useState } from "react";
import { suggest } from "@/lib/api";

const DEBOUNCE_MS = 150;
const MAX_SUGGESTIONS = 8;

interface SuggestionState {
  query: string;
  items: string[];
}

export function useSuggestions(query: string) {
  const trimmed = query.trim();
  const [state, setState] = useState<SuggestionState>({
    query: "",
    items: [],
  });

  useEffect(() => {
    if (!trimmed) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      suggest(trimmed, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setState({
            query: trimmed,
            items: (data.suggestions ?? []).slice(0, MAX_SUGGESTIONS),
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState({ query: trimmed, items: [] });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  return state.query === trimmed ? state.items : [];
}

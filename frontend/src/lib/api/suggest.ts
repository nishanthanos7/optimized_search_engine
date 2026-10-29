import { fetchJson } from "./client";
import type { SuggestionResponse } from "./types";

export async function suggest(
  query: string,
  signal?: AbortSignal,
): Promise<SuggestionResponse> {
  const params = new URLSearchParams({ q: query });
  return fetchJson<SuggestionResponse>(`/suggest?${params.toString()}`, {
    signal,
  });
}

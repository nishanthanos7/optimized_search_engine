import { fetchJson } from "./client";
import type { SearchResponse } from "./types";

export async function search(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return fetchJson<SearchResponse>(`/search?${params.toString()}`, { signal });
}

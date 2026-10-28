const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  engines: string[];
}

export interface SearchResponse {
  query: string;
  page: number;
  results: SearchResult[];
}

export interface SuggestionResponse {
  suggestions: string[];
}

export interface WikiSearchResponse {
  results: Array<{
    title: string;
    extract: string;
    image?: string;
  }>;
}

export interface WikiPageResponse {
  title: string;
  extract: string;
  image?: string;
  pageUrl?: string;
  [key: string]: any;
}

export interface AiAnswerResponseChunk {
  type: "text" | "sources";
  content?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain?: string;
    content?: string;
  }>;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
      ...init,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${res.statusText}${body ? ` | ${body.slice(0, 200)}` : ""}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[API] ${path} failed:`, err);
    throw err;
  }
}

export async function search(
  q: string,
  page = 1,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, page: String(page) });
  console.log(`[API] GET /search?q=${q}&page=${page}`);
  return fetchJson<SearchResponse>(`/search?${params}`, { signal });
}

export async function suggest(q: string): Promise<SuggestionResponse> {
  const params = new URLSearchParams({ q });
  console.log(`[API] GET /suggest?q=${q}`);
  return fetchJson<SuggestionResponse>(`/suggest?${params}`);
}

export async function wikiSearch(q: string): Promise<WikiSearchResponse> {
  const params = new URLSearchParams({ q });
  return fetchJson<WikiSearchResponse>(`/api/wiki/search?${params}`);
}

export async function wikiPage(title: string): Promise<WikiPageResponse> {
  const params = new URLSearchParams({ title });
  return fetchJson<WikiPageResponse>(`/api/wiki/page?${params}`);
}

export async function* aiAnswer(q: string, signal?: AbortSignal): AsyncGenerator<AiAnswerResponseChunk> {
  console.log(`[API] POST /api/ai-answer query=${q}`);
  const res = await fetch(`${API_BASE}/api/ai-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI answer request failed (${res.status})${body ? ` | ${body.slice(0, 200)}` : ""}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          const parsed = JSON.parse(line);
          yield parsed;
        } catch (e) {
          // Ignore malformed lines
        }
      }
    }
  }
}

export async function health() {
  return fetchJson<{ status: string; llm_provider: string; llm_available: boolean }>("/health");
}

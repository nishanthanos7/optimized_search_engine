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

export interface AiSource {
  title: string;
  url: string;
  domain?: string;
  content?: string;
}

export type AiStreamChunk =
  | { type: "text"; content: string }
  | { type: "sources"; sources: AiSource[] };

export interface HealthResponse {
  status: string;
  llm_provider: string;
  llm_available: boolean;
}

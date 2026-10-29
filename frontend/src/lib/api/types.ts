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

export interface CitizenService {
  slug: string;
  name_en: string;
  name_ne: string;
  description_en: string;
  questions: string[];
  source_count: number;
  last_checked?: string | null;
}

export interface CitizenSource {
  id: number;
  title: string;
  url: string;
  office?: string | null;
  service: string;
  last_checked: string;
  last_reviewed?: string | null;
  stale: boolean;
  needs_review: boolean;
  doc_type?: string | null;
}

export interface CitizenMeta {
  services: string[];
  language: "ne" | "en";
  verification: "verified" | "partial" | "failed" | "refused";
  conflicts: string[];
  stale: boolean;
  needs_review: boolean;
  last_checked?: string | null;
  last_reviewed?: string | null;
}

export type CitizenStreamChunk =
  | { type: "sources"; sources: CitizenSource[] }
  | { type: "text"; content: string }
  | { type: "meta"; meta: CitizenMeta };

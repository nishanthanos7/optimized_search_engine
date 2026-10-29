export { API_BASE, ApiError, fetchJson } from "./client";
export { search } from "./search";
export { suggest } from "./suggest";
export { streamAiAnswer } from "./ai";
export { streamCitizenAnswer, sendCitizenFeedback } from "./citizen";
export { health } from "./health";
export type {
  AiSource,
  AiStreamChunk,
  CitizenService,
  CitizenSource,
  CitizenMeta,
  CitizenStreamChunk,
  HealthResponse,
  SearchResponse,
  SearchResult,
  SuggestionResponse,
} from "./types";

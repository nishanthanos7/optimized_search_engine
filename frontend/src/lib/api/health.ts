import { fetchJson } from "./client";
import type { HealthResponse } from "./types";

export function health(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

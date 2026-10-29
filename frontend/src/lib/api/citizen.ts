import { ApiError, API_BASE } from "./client";
import type { CitizenStreamChunk } from "./types";

export function parseCitizenChunk(line: string): CitizenStreamChunk | null {
  try {
    const data = JSON.parse(line) as Partial<CitizenStreamChunk>;
    if (data.type === "text" && typeof data.content === "string") {
      return { type: "text", content: data.content };
    }
    if (data.type === "sources" && Array.isArray(data.sources)) {
      return { type: "sources", sources: data.sources };
    }
    if (data.type === "meta" && data.meta) {
      return { type: "meta", meta: data.meta };
    }
  } catch {
    // Ignore malformed JSONL lines.
  }
  return null;
}

export async function* streamCitizenAnswer(
  input: {
    query: string;
    service?: string | null;
    language: "ne" | "en";
  },
  signal?: AbortSignal,
): AsyncGenerator<CitizenStreamChunk> {
  const body: Record<string, unknown> = { query: input.query };
  if (input.service) body.service = input.service;
  body.language = input.language;

  const response = await fetch(`${API_BASE}/api/citizen/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new ApiError(
      `Citizen answer failed (${response.status})${
        bodyText ? `: ${bodyText.slice(0, 180)}` : ""
      }`,
      response.status,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          const chunk = parseCitizenChunk(line);
          if (chunk) yield chunk;
        }
        newline = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    const tail = buffer.trim();
    if (tail) {
      const chunk = parseCitizenChunk(tail);
      if (chunk) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function sendCitizenFeedback(input: {
  query: string;
  service?: string | null;
  helpful: boolean;
  note?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE}/api/citizen/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new ApiError(
      `Citizen feedback failed (${response.status})${
        bodyText ? `: ${bodyText.slice(0, 180)}` : ""
      }`,
      response.status,
    );
  }
}

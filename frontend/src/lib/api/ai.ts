import { ApiError, API_BASE } from "./client";
import type { AiStreamChunk } from "./types";

function parseChunk(line: string): AiStreamChunk | null {
  try {
    const data = JSON.parse(line) as Partial<AiStreamChunk>;
    if (data.type === "text" && typeof data.content === "string") {
      return { type: "text", content: data.content };
    }
    if (data.type === "sources" && Array.isArray(data.sources)) {
      return { type: "sources", sources: data.sources };
    }
  } catch {
    // Ignore malformed JSONL lines.
  }
  return null;
}

export async function* streamAiAnswer(
  query: string,
  signal?: AbortSignal,
): AsyncGenerator<AiStreamChunk> {
  const response = await fetch(`${API_BASE}/api/ai-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApiError(
      `AI answer failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`,
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
          const chunk = parseChunk(line);
          if (chunk) yield chunk;
        }
        newline = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    const tail = buffer.trim();
    if (tail) {
      const chunk = parseChunk(tail);
      if (chunk) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

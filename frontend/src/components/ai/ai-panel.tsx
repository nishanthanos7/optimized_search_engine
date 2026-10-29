"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiAnswer } from "@/hooks/use-ai-answer";
import { cn } from "@/lib/utils";
import { AiAnswer } from "./ai-answer";
import { AiSources } from "./ai-sources";
import { AiThinking } from "./ai-thinking";

interface AiPanelProps {
  query: string;
  enabled: boolean;
  onClose: () => void;
}

export function AiPanel({ query, enabled, onClose }: AiPanelProps) {
  if (!enabled) return null;
  return <AiPanelContent key={query} query={query} onClose={onClose} />;
}

function AiPanelContent({
  query,
  onClose,
}: {
  query: string;
  onClose: () => void;
}) {
  const { status, answer, sources, retry } = useAiAnswer(query);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const busy = status === "thinking" || status === "streaming";

  return (
    <section
      className="animate-fade-up relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
      aria-label="AI answer"
    >
      {busy && (
        <div
          className="absolute inset-x-0 top-0 h-px overflow-hidden bg-white/10"
          aria-hidden="true"
        >
          <span className="thinking-bar block h-full w-1/4 bg-white/80" />
        </div>
      )}

      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-black">
          <Sparkles className="size-3.5" />
        </span>
        <span className="shrink-0 text-sm font-semibold tracking-[-0.01em]">
          Index AI
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-faint">
          {query}
        </span>
        {busy && (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            {status === "thinking" ? "Reading" : "Writing"}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI answer"
        >
          <X className="size-4" />
        </Button>
      </div>

      {status === "thinking" && <AiThinking />}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 px-4 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Couldn&apos;t generate an answer. Check that the backend and LLM
            provider are configured.
          </p>
          <Button variant="outline" size="sm" onClick={retry} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Try again
          </Button>
        </div>
      )}

      {(status === "streaming" || status === "done") && (
        <>
          <div className="px-4 py-5 sm:px-5">
            <AiAnswer
              text={answer}
              sources={sources}
              streaming={status === "streaming"}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] bg-white/[0.015] px-4 py-2">
            <button
              type="button"
              onClick={() => setSourcesOpen((open) => !open)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
              aria-expanded={sourcesOpen}
            >
              Sources ({sources.length})
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  sourcesOpen && "rotate-180",
                )}
              />
            </button>

            {status === "done" && (
              <Button
                variant="ghost"
                size="xs"
                onClick={retry}
                className="gap-1"
              >
                <RotateCcw className="size-3" />
                Regenerate
              </Button>
            )}
          </div>

          {sourcesOpen && <AiSources sources={sources} />}
        </>
      )}
    </section>
  );
}

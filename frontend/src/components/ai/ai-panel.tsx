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
      className="animate-fade-up mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      aria-label="AI answer"
    >
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-white">
          <Sparkles className="size-4" />
        </span>
        <span className="shrink-0 text-sm font-semibold">Nova AI</span>
        <span className="min-w-0 flex-1 truncate text-xs text-faint">
          {query}
        </span>
        {busy && (
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            {status === "thinking" ? "Reading sources" : "Writing"}
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
          <div className="px-4 py-4">
            <AiAnswer
              text={answer}
              sources={sources}
              streaming={status === "streaming"}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-muted px-4 py-2">
            <button
              type="button"
              onClick={() => setSourcesOpen((open) => !open)}
              className="flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
              aria-expanded={sourcesOpen}
            >
              Sources ({sources.length})
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
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

"use client";

import type { CitizenSource } from "@/lib/api";
import { useCitizenAnswer } from "@/hooks/use-citizen-answer";
import { Button } from "@/components/ui/button";
import { CitizenSources } from "./citizen-sources";
import { Feedback } from "./feedback";
import { ShareButton } from "./share-button";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitizenAnswerPanelProps {
  query: string;
  service: string | null;
  language: "ne" | "en";
  onRetry: () => void;
}

function renderInline(text: string, sources: CitizenSource[]): React.ReactNode {
  const parts = text.split(/(\[\d+\]|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const citation = part.match(/^\[(\d+)\]$/);
    if (citation) {
      const number = Number(citation[1]);
      const source = sources[number - 1];
      if (!source) return part;

      return (
        <a
          key={index}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.title}
          className="mx-0.5 inline-flex size-4 -translate-y-0.5 items-center justify-center rounded bg-white/10 align-middle font-mono text-[10px] font-semibold text-white/70 transition-colors hover:bg-white hover:text-black"
        >
          {number}
        </a>
      );
    }

    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {bold[1]}
        </strong>
      );
    }

    return part;
  });
}

export function CitizenAnswerPanel({
  query,
  service,
  language,
  onRetry,
}: CitizenAnswerPanelProps) {
  const { status, answer, sources, meta, retry } = useCitizenAnswer({
    query,
    service,
    language,
  });
  const busy = status === "thinking" || status === "streaming";

  if (status === "error") {
    return (
      <section
        className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl px-4 py-5"
        aria-label="Citizen answer"
      >
        <div className="flex flex-col items-start gap-3 text-sm text-muted">
          <p>
            Couldn&apos;t generate an answer. Check that the backend and LLM
            provider are configured.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const verificationBadge =
    meta && meta.verification !== "verified" ? (
      <span className="inline-flex items-center gap-1 rounded bg-white/[0.08] px-2 py-0.5 font-mono text-[9px] text-white/60">
        verification warning
      </span>
    ) : null;

  const staleBadge =
    meta && meta.stale ? (
      <span className="inline-flex items-center gap-1 rounded bg-white/[0.08] px-2 py-0.5 font-mono text-[9px] text-white/60">
        source may be outdated
      </span>
    ) : null;

  const needsReviewBadge =
    meta && meta.needs_review ? (
      <span className="inline-flex items-center gap-1 rounded bg-white/[0.08] px-2 py-0.5 font-mono text-[9px] text-white/60">
        details under review
      </span>
    ) : null;

  return (
    <section
      className={cn(
        "relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl",
        busy && "animate-fade-up",
      )}
      aria-label="Citizen answer"
    >
      {busy && (
        <div className="absolute inset-x-0 top-0 h-px overflow-hidden bg-white/10">
          <span className="thinking-bar block h-full w-1/4 bg-white/80" />
        </div>
      )}

      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-black">
          <Sparkles className="size-3.5" />
        </span>
        <span className="shrink-0 text-sm font-semibold tracking-[-0.01em]">
          Index Citizen
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
          onClick={onRetry}
          aria-label="Close citizen answer"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      {status === "thinking" && (
        <div className="px-4 py-5 text-sm text-muted">
          Searching official sources…
        </div>
      )}

      {(status === "streaming" || status === "done") && answer && (
        <>
          <div className="px-4 py-5 sm:px-5">
            <div className="space-y-3 text-[15px] leading-7 text-[#d4d4d4]">
              {answer.split(/\n{2,}/).map((block, index) => {
                const lines = block.split("\n");
                const isList = lines.every((line) =>
                  /^\s*[-*•]\s+/.test(line),
                );

                if (isList) {
                  return (
                    <ul
                      key={index}
                      className="list-disc space-y-1.5 pl-5 marker:text-white/30"
                    >
                      {lines.map((line, lineIndex) => (
                        <li key={lineIndex}>
                          {renderInline(
                            line.replace(/^\s*[-*•]\s+/, ""),
                            sources,
                          )}
                        </li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <p key={index} className="whitespace-pre-wrap">
                    {renderInline(block, sources)}
                  </p>
                );
              })}
              {status === "streaming" && (
                <span
                  className="cursor-blink ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-white"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          <CitizenSources sources={sources} />

          <div className="border-t border-white/[0.07] bg-white/[0.015] px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 text-faint">
                <span className="font-mono uppercase tracking-[0.14em]">
                  Source checked:
                </span>
                <span className="font-mono">
                  {meta?.last_checked
                    ? meta.last_checked.split("T")[0]
                    : "—"}
                </span>
                {verificationBadge}
                {staleBadge}
                {needsReviewBadge}
              </div>
              <div className="flex items-center gap-2">
                <Feedback query={query} service={service} />
                <ShareButton
                  text={answer}
                  url={typeof window !== "undefined" ? window.location.href : ""}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-faint">
              AI summary. Confirm fees and documents with the office.
            </p>
          </div>
        </>
      )}

      {status === "done" && (
        <Button
          variant="ghost"
          size="xs"
          onClick={retry}
          className="mt-2 gap-1"
        >
          <RotateCcw className="size-3" />
          Regenerate
        </Button>
      )}
    </section>
  );
}

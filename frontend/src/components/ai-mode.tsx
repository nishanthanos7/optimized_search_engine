"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiAnswer } from "@/lib/api";

interface AiSource {
  title: string;
  url: string;
  domain?: string;
  content?: string;
}

interface AiModePanelProps {
  query: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function faviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
  } catch {
    return "";
  }
}

export function AiModePanel({
  query,
  enabled,
  onToggle,
}: AiModePanelProps) {
  const [status, setStatus] = useState<
    "idle" | "thinking" | "answer" | "error"
  >("idle");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AiSource[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setAnswer("");
    setSources([]);
    setSourcesOpen(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reset();
      return;
    }

    let cancelled = false;
    (async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setStatus("thinking");
      setAnswer("");
      setSources([]);
      setSourcesOpen(false);
      try {
        for await (const chunk of aiAnswer(
          query,
          abortRef.current.signal
        )) {
          if (cancelled || !mountedRef.current || abortRef.current?.signal.aborted) {
            break;
          }
          if (chunk.type === "text") {
            setStatus("answer");
            setAnswer((prev) => prev + chunk.content);
          } else if (chunk.type === "sources") {
            setSources(chunk.sources || []);
          }
        }
      } catch {
        if (cancelled || !mountedRef.current) return;
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, query]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const handleStop = () => {
    reset();
    onToggle(false);
  };

  const renderAnswer = () => {
    const parts = answer.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const src = sources[n - 1];
        return (
          <span
            key={i}
            className="ai-cite cursor-pointer select-none"
            onClick={() => {
              if (src) {
                setSourcesOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            title={src ? `${src.title} — ${src.url}` : `Source ${n}`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!enabled) return null;

  const hasAnswer = status === "answer" || status === "error";
  const showPanel = hasAnswer || status === "thinking";

  if (!showPanel) return null;

  return (
    <section className="ai-mode-panel animate-slideUpFade">
      <div className="ai-mode-card border-animate">
        {/* Header — collapsible + toggle */}
        <div
          className="ai-mode-header"
          onClick={() => setSourcesOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSourcesOpen((o) => !o);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span className="ai-mode-badge">AI Mode</span>
            <span className="ai-mode-query" title={query}>
              {query}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {status === "thinking" && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-semibold text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-spin" />
                Generating answer
              </div>
            )}
            <Button
              size="icon-xs"
              variant="outline"
              onClick={handleStop}
              className="h-7 w-7 p-0 text-text-faint hover:text-text hover:bg-surface-2 dark:hover:text-white dark:hover:bg-surface-3"
              aria-label="Turn off AI mode"
            >
              <X size={14} strokeWidth={2.2} />
            </Button>
          </div>
        </div>

        {/* Thinking state */}
        {status === "thinking" && (
          <div className="ai-mode-thinking">
            <span className="thinking-label">Reading search results</span>
            <div className="thinking-ring">
              <div className="thinking-marquee">
                {["DuckDuckGo", "Bing", "Wikipedia"].map((name) => (
                  <div
                    key={name}
                    className="thinking-site flex items-center justify-center text-[10px] font-semibold text-text-muted"
                  >
                    {name[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="px-6 py-4 text-center">
            <p className="text-sm text-destructive">
              Couldn&apos;t generate an AI answer. The LLM may not be configured.
            </p>
          </div>
        )}

        {/* Answer */}
        {status === "answer" && (
          <div className="ai-mode-answer" style={{ whiteSpace: "pre-wrap" }}>
            {renderAnswer()}
          </div>
        )}

        {/* Answer bar (expand/collapse hint + sources count)} */}
        {hasAnswer && (
          <div className="ai-mode-answer-bar">
            <span className="ai-mode-answer-toggle">
              {sourcesOpen ? "Show less" : `Show sources (${sources.length})`}
              <ExternalLink size={14} strokeWidth={1.8} />
            </span>
            {status !== "error" && (
              <Button
                size="icon-xs"
                onClick={handleStop}
                className="h-7 w-7 p-0 text-text-faint hover:text-text hover:bg-surface-2 dark:hover:text-white dark:hover:bg-surface-3"
                aria-label="Dismiss AI answer"
              >
                <X size={14} strokeWidth={2.2} />
              </Button>
            )}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && sourcesOpen && (
          <div className="ai-mode-sources open">
            <h4>Sources</h4>
            <table className="ai-source-table">
              <tbody>
                {sources.map((src, i) => (
                  <tr key={i} onClick={() => window.open(src.url, "_blank")} style={{ cursor: "pointer" }}>
                    <td className="ai-source-number-cell">{i + 1}</td>
                    <td className="ai-source-favicon-cell">
                      <img src={faviconUrl(src.url)} alt="" loading="lazy" />
                    </td>
                    <td className="ai-source-content-cell">
                      <span className="ai-source-title" title={src.title}>
                        {src.title || src.url}
                      </span>
                      <span className="ai-source-url">{src.domain}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

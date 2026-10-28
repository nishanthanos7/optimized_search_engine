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

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setAnswer("");
    setSources([]);
    setSourcesOpen(false);
    onToggle(false);
  }, [onToggle]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      stop();
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
        for await (const chunk of aiAnswer(query, abortRef.current.signal)) {
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
        if (!cancelled && mountedRef.current) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, query, onToggle]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

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
            className="nova-cite cursor-pointer select-none"
            onClick={() => {
              if (src) setSourcesOpen(true);
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
  const showPanel =
    status === "thinking" || status === "answer" || status === "error";
  if (!showPanel) return null;

  return (
    <section className="nova-ai-panel animate-fadeIn">
      <div className="nova-card border-glow">
        {/* Header */}
        <div
          className="nova-header"
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
          <div className="nova-header-left flex items-center gap-3">
            <div className="nova-icon-wrap">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="nova-badge">Nova AI</span>
            <span className="nova-query" title={query}>
              {query}
            </span>
          </div>
          <div className="nova-header-right flex items-center gap-2">
            {status === "thinking" && (
              <div className="nova-thinking-chip flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(79,70,229,0.15)] border border-[rgba(79,70,229,0.35)] text-[var(--accent)] text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                Reading the web
              </div>
            )}
            <Button
              size="icon-xs"
              variant="outline"
              onClick={stop}
              className="h-7 w-7 p-0 text-text-faint hover:text-white hover:bg-surface-2"
              aria-label="Turn off AI mode"
            >
              <X size={14} strokeWidth={2.2} />
            </Button>
          </div>
        </div>

        {/* Thinking state */}
        {status === "thinking" && (
          <div className="nova-thinking">
            <span className="nova-thinking-label">Reading search results</span>
            <div className="nova-ring">
              <div className="nova-marquee">
                {["DuckDuckGo", "Bing", "Wikipedia"].map((name, i) => (
                  <div
                    key={i}
                    className="nova-site flex items-center justify-center text-[10px] font-bold text-text-muted"
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
          <div className="nova-error p-6 text-center">
            <p className="text-sm text-destructive">
              Couldn&apos;t generate an AI answer. The NVIDIA Nemotron model may not be configured.
            </p>
          </div>
        )}

        {/* Answer */}
        {status === "answer" && (
          <div
            className="nova-answer"
            style={{ whiteSpace: "pre-wrap", minHeight: "80px" }}
          >
            {answer.length ? (
              <>
                {renderAnswer()}
                <span className="nova-cursor">▋</span>
              </>
            ) : (
              <span className="nova-placeholder">Generating answer…</span>
            )}
          </div>
        )}

        {/* Answer bar */}
        {status === "answer" && (
          <div className="nova-bar">
            <span
              className="nova-bar-text cursor-pointer select-none"
              onClick={() => setSourcesOpen((o) => !o)}
            >
              {sourcesOpen ? "Collapse sources" : `Sources (${sources.length})`}
              <ExternalLink
                size={14}
                strokeWidth={1.8}
                className="ml-1 opacity-60"
              />
            </span>
            <Button
              size="icon-xs"
              variant="outline"
              onClick={stop}
              className="h-7 w-7 p-0 text-text-faint hover:text-white hover:bg-surface-2"
              aria-label="Dismiss AI answer"
            >
              <X size={14} strokeWidth={2.2} />
            </Button>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && sourcesOpen && (
          <div className="nova-sources">
            <h4 className="nova-sources-title">Sources</h4>
            <div className="nova-source-list">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nova-source-row"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="nova-source-num">{i + 1}</div>
                  <img
                    src={faviconUrl(src.url)}
                    alt=""
                    className="nova-source-fav"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="nova-source-body">
                    <div className="nova-source-title">
                      {src.title || src.url}
                    </div>
                    <div className="nova-source-url">
                      {src.domain || new URL(src.url).hostname}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

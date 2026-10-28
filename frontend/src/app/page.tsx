"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { search, suggest, health, type SearchResult } from "@/lib/api";
import { SearchBar } from "@/components/search-bar";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    health()
      .then((res) => console.log("[Health] Backend reachable:", res))
      .catch((err) => console.error("[Health] Backend unreachable:", err));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await suggest(query);
        setSuggestions(data.suggestions.slice(0, 8));
        setSuggestionsOpen(data.suggestions.length > 0);
      } catch {
        setSuggestions([]);
        setSuggestionsOpen(false);
      }
    }, 140);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const runSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      searchSeqRef.current += 1;
      abortRef.current?.abort();
      setLoading(false);
      setResults([]); setResultCount(0); setError(""); return;
    }
    searchSeqRef.current += 1;
    const seq = searchSeqRef.current;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError("");
    try {
      const data = await search(q, p, abortRef.current.signal);
      if (seq !== searchSeqRef.current) return;
      setResults(data.results || []);
      setResultCount(data.results?.length || 0);
      setPage(data.page || 1);
    } catch (err) {
      if (seq !== searchSeqRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]); setResultCount(0);
    } finally {
      if (seq === searchSeqRef.current) setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((q: string) => {
    const trimmedQuery = q.trim();
    if (!trimmedQuery) return;
    setQuery(trimmedQuery);
    setActiveQuery(trimmedQuery);
    setSuggestionsOpen(false);
    runSearch(trimmedQuery, 1);
  }, [runSearch]);

  const handlePageChange = useCallback((p: number) => {
    runSearch(activeQuery, p);
  }, [activeQuery, runSearch]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSuggestions([]); setSuggestionsOpen(false);
    setQuery(suggestion);
    setActiveQuery(suggestion);
    runSearch(suggestion, 1);
  }, [runSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) handleSearch(q);
  };

  const handleClear = () => {
    searchSeqRef.current += 1;
    abortRef.current?.abort();
    setLoading(false);
    setQuery("");
    setActiveQuery("");
    setSuggestions([]); setSuggestionsOpen(false);
    setResults([]); setResultCount(0); setError("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isHome = !activeQuery && !loading && !error && results.length === 0;

  const escapeHtml = (value: string): string => {
    const map: Record<string, string> = {
      "&": "\u0026\u0061\u006D\u0070\u003B",
      "<": "\u0026\u006C\u0074\u003B",
      ">": "\u0026\u0067\u0074\u003B",
      '"': "\u0026\u0071\u0075\u006F\u0074\u003B",
      "'": "\u0026\u0023\u0033\u0039\u003B"
    };
    return String(value ?? "").replace(/[&<>"']/g, (c) => map[c] ?? c);
  };

  const highlight = (text: string, query: string): string => {
    const source = String(text ?? "");
    const terms = Array.from(
      new Set((query.toLowerCase().match(/[\w-]+/g) || []).filter((t) => t.length > 1)),
    ).sort((a, b) => b.length - a.length);
    if (!terms.length) return escapeHtml(source);
    const pattern = new RegExp(
      "(" + terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")",
      "gi",
    );
    return source
      .split(pattern)
      .map((part, i) => {
        const escaped = escapeHtml(part);
        return i % 2 === 1 ? `<mark>${escaped}</mark>` : escaped;
      })
      .join("");
  };

  return (
    <Layout layout={isHome ? "home" : "search"}>
      <header className="header-container">
        <Link href="/" className="logo flex items-center gap-3" aria-label="Metasearch home" onClick={handleClear}>
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m20 20-4.1-4.1" />
            </svg>
          </span>
          <span className="logo-text">Metasearch</span>
        </Link>

        {isHome && <p className="home-tagline">Every corner of the web, one search away.</p>}

        <SearchBar
          ref={inputRef}
          query={query}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onClear={handleClear}
          suggestions={suggestions}
          suggestionsOpen={suggestionsOpen}
          handleSuggestionSelect={handleSuggestionSelect}
          setSuggestionsOpen={setSuggestionsOpen}
        />

        {isHome && (
          <p className="home-hint">
            Press <kbd>/</kbd> to focus &middot; Searches DuckDuckGo, Bing &amp; Wikipedia
          </p>
        )}
      </header>

      {!isHome && (
        <main className="main-content">
          <SearchResults
            query={activeQuery}
            page={page}
            results={results}
            resultCount={resultCount}
            loading={loading}
            error={error}
            handleSearch={handleSearch}
            handlePageChange={handlePageChange}
            escapeHtml={escapeHtml}
            highlight={highlight}
          />
        </main>
      )}
    </Layout>
  );
}

function SearchResults({
  query,
  page,
  results,
  resultCount,
  loading,
  error,
  handleSearch,
  handlePageChange,
  escapeHtml,
  highlight,
}: {
  query: string; page: number; results: SearchResult[]; resultCount: number;
  loading: boolean; error: string;
  handleSearch: (q: string) => void; handlePageChange: (p: number) => void;
  escapeHtml: (value: string) => string; highlight: (text: string, query: string) => string;
}) {
  return (
    <>
      <div className="results-meta max-w-4xl mx-auto px-4">
        {loading ? (
          <span className="meta-loading flex items-center gap-2">
            <span className="spinner inline-block border-2 border-t-text rounded-full animate-spin" aria-hidden="true" />
            Searching for <strong>{escapeHtml(query)}</strong>…
          </span>
        ) : error ? (
          <span>Search failed for <strong>{escapeHtml(query)}</strong></span>
        ) : (
          <>
            {resultCount === 1 ? (
              <span>Showing <strong>1 result</strong> for <strong>{escapeHtml(query)}</strong></span>
            ) : resultCount > 0 ? (
              <span>Showing <strong>{resultCount} results</strong> for <strong>{escapeHtml(query)}</strong></span>
            ) : (
              <span>No results for <strong>{escapeHtml(query)}</strong></span>
            )}
            <span className="meta-page">Page {page}</span>
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {error ? (
          <Card className="state-card mx-auto" style={{ maxWidth: 520 }}>
            <CardContent className="p-8">
              <div className="state-icon mx-auto">
                <AlertCircle size={26} strokeWidth={1.8} />
              </div>
              <CardTitle className="state-title">Something went wrong</CardTitle>
              <p className="state-desc">
                We couldn&apos;t reach the search service. Check your connection and try again.
              </p>
              <Button onClick={() => handleSearch(query)} className="w-full text-white bg-[var(--accent)] hover:bg-opacity-90 shadow-lg rounded-xl hover:brightness-105">Try again</Button>
            </CardContent>
          </Card>
        ) : results.length === 0 && !loading ? (
          <Card className="state-card mx-auto" style={{ maxWidth: 520 }}>
            <CardContent className="p-8">
              <div className="state-icon mx-auto">
                <Search size={26} strokeWidth={1.8} />
              </div>
              <CardTitle className="state-title">No results for &quot;{escapeHtml(query)}&quot;</CardTitle>
              <p className="state-desc">
                Try a different spelling, a broader phrase, or fewer keywords.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {loading && !results.length ? (
              <>
                <div className="skeleton-card px-4 py-4 mb-3 animate-shimmer" style={{ height: 110 }}>
                  <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full animate-shimmer shrink-0" />
                    <div className="flex-1">
                      <div className="w-3/4 h-3 animate-shimmer mb-2" />
                      <div className="w-1/2 h-2.5 animate-shimmer mb-2" />
                      <div className="w-5/6 h-3 animate-shimmer mb-2" />
                      <div className="w-2/3 h-2.5 animate-shimmer" />
                    </div>
                  </div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-card px-4 py-4 mb-3 animate-shimmer" style={{ height: 100 }}>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full animate-shimmer shrink-0" />
                      <div className="flex-1">
                        <div className="w-3/4 h-3 animate-shimmer mb-2" />
                        <div className="w-1/2 h-2.5 animate-shimmer mb-2" />
                        <div className="w-5/6 h-3 animate-shimmer mb-2" />
                        <div className="w-2/3 h-2.5 animate-shimmer" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {results.map((item, i) => (
                  <article key={item.url} className="result-item" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-start gap-12 min-w-0 mb-2">
                      <div className="relative shrink-0">
                        <div className="favicon-box">
                          <img
                            className="favicon"
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(new URL(item.url).hostname.replace(/^www\./i, ""))}`}
                            alt=""
                            width="48" height="48"
                            onLoad={(e) => { (e.target as HTMLImageElement).classList.add("loaded"); }}
                            onError={(e) => { (e.target as HTMLImageElement).remove(); }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center font-bold text-[15px] text-text-faint opacity-0 transition-opacity">
                            {item.url.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 min-w-0 overflow-hidden mb-1">
                          <span className="text-sm font-semibold text-text-muted truncate dark:text-text-muted">{new URL(item.url).hostname.replace(/^www\./i, "")}</span>
                          {item.url && (
                            <span className="overflow-hidden min-w-0 text-xs text-text-faint truncate dark:text-text-muted">{new URL(item.url).pathname}</span>
                          )}
                        </div>
                        {item.engines.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {item.engines.map((engine: string) => {
                              const cls = engine.toLowerCase().includes("duck") ? "eng-ddg" :
                                engine.toLowerCase().includes("bing") ? "eng-bing" :
                                engine.toLowerCase().includes("wiki") ? "eng-wiki" : "eng-default";
                              return (
                                <span key={engine} className={`engines-tag ${cls}`}>
                                  {engine}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={item.url} target="_blank" rel="noopener noreferrer"
                      className="result-title"
                      dangerouslySetInnerHTML={{ __html: highlight(item.title, query) }}
                    />
                    {item.snippet && (
                      <p className="result-snippet" dangerouslySetInnerHTML={{ __html: highlight(item.snippet, query) }} />
                    )}
                  </article>
                ))}
                <Pagination page={page} resultCount={resultCount} onPageChange={handlePageChange} />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Pagination({
  page,
  resultCount,
  onPageChange,
}: {
  page: number; resultCount: number; onPageChange: (p: number) => void;
}) {
  const pageWindow = 7;
  const pageLead = 3;
  const start = Math.max(1, page - pageLead);
  const end = start + pageWindow - 1;
  const handlePageClick = useCallback((p: number) => {
    if (!Number.isFinite(p) || p < 1 || p === page) return;
    onPageChange(p);
  }, [page, onPageChange]);
  if (page === 1 && resultCount === 0) return null;
  const hasNext = resultCount > 0;

  return (
    <nav className="pagination" aria-label="Search results pages">
      <Button
        variant="outline" size="sm"
        onClick={() => handlePageClick(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-2 min-w-[40px] h-10 px-4 text-sm font-semibold border border-border hover:bg-surface-2 dark:hover:bg-surface-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span className="page-arrow">Previous</span>
      </Button>
      {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
        (pageNumber) => {
          const isCurrent = pageNumber === page;
          return (
            <Button
              key={pageNumber}
              variant={isCurrent ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageClick(pageNumber)}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "min-w-[40px] h-10 px-4 text-sm font-semibold",
                isCurrent
                  ? "bg-[var(--accent)] text-white shadow-lg border-transparent hover:brightness-105"
                  : "border border-border hover:bg-surface-2 hover:text-text dark:border-border dark:hover:bg-surface-2 dark:hover:text-text",
              )}
            >
              {pageNumber}
            </Button>
          );
        },
      )}
      <Button
        variant="outline" size="sm"
        onClick={() => handlePageClick(page + 1)}
        disabled={!hasNext}
        className="flex items-center gap-2 min-w-[40px] h-10 px-4 text-sm font-semibold border border-border hover:bg-surface-2 dark:hover:bg-surface-2"
      >
        <span className="page-arrow">Next</span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Button>
    </nav>
  );
}

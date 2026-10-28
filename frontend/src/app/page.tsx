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

  // Backend connectivity check on mount
  useEffect(() => {
    health()
      .then((res) => {
        console.log("[Health] Backend reachable:", res);
      })
      .catch((err) => {
        console.error("[Health] Backend unreachable:", err);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await suggest(query);
        setSuggestions(data.suggestions.slice(0, 8));
        setSuggestionsOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 120);
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
    if (!e.target.value.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
    }
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

  // "/" focuses the search input from anywhere on the page.
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
        <Link href="/" className="logo" aria-label="Metasearch home" onClick={handleClear}>
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m20 20-4.1-4.1" />
            </svg>
          </span>
          <span className="logo-text">Metasearch</span>
        </Link>

        {isHome && (
          <p className="home-tagline">Every corner of the web, one search away.</p>
        )}

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
            Press <kbd className="px-2 py-0.5 text-xs font-semibold text-text-faint bg-surface-2 border border-border rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">/</kbd>{" "}
            to focus · Searches DuckDuckGo, Bing & Wikipedia
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
      <div className="results-meta">
        {loading ? (
          <span className="meta-loading flex items-center gap-2">
            <span className="spinner inline-block w-3.5 h-3.5 border-2 border-border border-t-text rounded-full animate-spin dark:border-gray-600 dark:border-t-white" aria-hidden="true" />
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

      {error ? (
        <Card className="error-card mt-4">
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-text-faint dark:bg-gray-700 dark:text-gray-500">
                <AlertCircle size={24} strokeWidth={1.8} />
              </div>
            </div>
            <CardTitle>Something went wrong</CardTitle>
            <p className="max-w-[46ch] text-sm text-text-muted dark:text-text-muted mx-auto">
              We couldn&apos;t reach the search service. Check your connection and try again.
            </p>
            <Button onClick={() => handleSearch(query)} className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-black shadow-lg rounded-xl hover:brightness-106 dark:bg-white dark:text-black">Try again</Button>
          </CardContent>
        </Card>
      ) : results.length === 0 && !loading ? (
        <Card className="empty-card mt-4">
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-text-faint dark:bg-gray-700 dark:text-gray-500">
                <Search size={24} strokeWidth={1.8} />
              </div>
            </div>
            <CardTitle>No results for &quot;{escapeHtml(query)}&quot;</CardTitle>
            <p className="max-w-[46ch] text-sm text-text-muted dark:text-text-muted mx-auto">
              Try a different spelling, a broader phrase, or fewer keywords.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {loading && !results.length ? (
            <>
              <div className="skeleton-card px-4 py-4 mx-4 mb-1">
                <div className="flex gap-3 mb-3">
                  <div className="animate-shimmer w-7 h-7 rounded-sm" />
                  <div className="flex-1">
                    <div className="animate-shimmer w-42 h-3" />
                    <div className="animate-shimmer w-[56%] h-5 mt-2" />
                    <div className="animate-shimmer w-[92%] h-3 mt-2" />
                    <div className="animate-shimmer w-[68%] h-3 mt-1" />
                  </div>
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-card px-4 py-4 mx-4 mb-1">
                  <div className="flex gap-3 mb-3">
                    <div className="animate-shimmer w-7 h-7 rounded-sm" />
                    <div className="flex-1">
                      <div className="animate-shimmer w-42 h-3" />
                      <div className="animate-shimmer w-[56%] h-5 mt-2" />
                      <div className="animate-shimmer w-[92%] h-3 mt-2" />
                      <div className="animate-shimmer w-[68%] h-3 mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {results.map((item, i) => (
                <article key={item.url} className="result-item" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
                  <div className="flex items-start gap-3 min-w-0 mb-2">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-2 border border-border flex-shrink-0 dark:bg-gray-700 dark:border-gray-600 shrink-0" aria-hidden="true">
                      <span className="absolute inset-0 flex items-center justify-center font-bold text-sm text-text-faint dark:text-gray-500">
                        {item.url.charAt(0).toUpperCase()}
                      </span>
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(new URL(item.url).hostname.replace(/^www\./i, ""))}`}
                        alt=""
                        width="56" height="56"
                        className="w-full h-full object-cover opacity-0 transition-opacity duration-300 shrink-0"
                        onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1"; }}
                        onError={(e) => { (e.target as HTMLImageElement).remove(); }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                        <span className="text-sm font-semibold text-text-muted truncate dark:text-text-muted">{new URL(item.url).hostname.replace(/^www\./i, "")}</span>
                        {item.url && (
                          <span className="overflow-hidden min-w-0 text-xs text-text-faint truncate dark:text-text-muted">{new URL(item.url).pathname}</span>
                        )}
                      </div>
                      {item.engines.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end mt-auto ml-auto">
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

  // Determine if there is a next page. We approximate: if the last page
  // rendered a full set of results, assume more pages may exist.
  const hasNext = resultCount > 0;

  return (
    <nav className="pagination flex flex-wrap items-center justify-center gap-2 mt-8 pt-6 border-t border-border dark:border-gray-600" aria-label="Search results pages">
      <Button
        variant="outline" size="sm"
        onClick={() => handlePageClick(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-2 min-w-[38px] h-9 px-3 text-sm font-semibold"
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
                "min-w-[38px] h-9 px-3 text-sm font-semibold",
                isCurrent
                  ? "bg-black text-white shadow-lg border-transparent dark:bg-white dark:text-black"
                  : "hover:text-text hover:bg-surface-2 hover:border-border dark:hover:text-text dark:hover:bg-gray-700 dark:hover:border-gray-600",
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
        className="flex items-center gap-2 min-w-[38px] h-9 px-3 text-sm font-semibold"
      >
        <span className="page-arrow">Next</span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Button>
    </nav>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AiPanel } from "@/components/ai/ai-panel";
import { AppShell } from "@/components/layout/app-shell";
import { ResultsSection } from "@/components/results/results-section";
import { useSearch } from "@/hooks/use-search";
import { buildSearchUrl, parsePage } from "@/lib/search-url";
import { SearchBar } from "./search-bar";
import { SearchHeader } from "./search-header";

export function SearchView() {
  const router = useRouter();
  const params = useSearchParams();

  const query = (params.get("q") ?? "").trim();
  const page = parsePage(params.get("page"));
  const aiEnabled = params.get("ai") === "1";

  const navigate = useCallback(
    (nextQuery: string, nextPage: number, nextAi: boolean) => {
      router.push(buildSearchUrl(nextQuery, nextPage, nextAi));
    },
    [router],
  );

  const handleSearch = useCallback(
    (nextQuery: string) => navigate(nextQuery, 1, aiEnabled),
    [navigate, aiEnabled],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => navigate(query, nextPage, aiEnabled),
    [navigate, query, aiEnabled],
  );

  const handleToggleAi = useCallback(
    () => navigate(query, page, !aiEnabled),
    [navigate, query, page, aiEnabled],
  );

  const handleCloseAi = useCallback(
    () => navigate(query, page, false),
    [navigate, query, page],
  );

  if (!query) {
    return (
      <AppShell>
        <SearchHeader
          query=""
          aiEnabled={false}
          showAi={false}
          onSearch={handleSearch}
          onToggleAi={handleToggleAi}
        />
        <main className="flex flex-1 items-center justify-center px-4 pb-20">
          <div className="w-full max-w-xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Start a search
            </h1>
            <p className="mt-2 text-sm text-muted">
              Search DuckDuckGo, Bing and Wikipedia at once.
            </p>
            <SearchBar
              size="lg"
              autoFocus
              onSearch={handleSearch}
              className="mt-6"
            />
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SearchHeader
        query={query}
        aiEnabled={aiEnabled}
        onSearch={handleSearch}
        onToggleAi={handleToggleAi}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-5">
        <AiPanel
          key={query}
          query={query}
          enabled={aiEnabled}
          onClose={handleCloseAi}
        />

        <SearchContent
          key={`${query}:${page}`}
          query={query}
          page={page}
          onPageChange={handlePageChange}
        />
      </main>
    </AppShell>
  );
}

interface SearchContentProps {
  query: string;
  page: number;
  onPageChange: (page: number) => void;
}

function SearchContent({ query, page, onPageChange }: SearchContentProps) {
  const { results, loading, error, retry } = useSearch(query, page);

  return (
    <ResultsSection
      query={query}
      page={page}
      results={results}
      loading={loading}
      error={error}
      onRetry={retry}
      onPageChange={onPageChange}
    />
  );
}

import type { SearchResult } from "@/lib/api";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { Pagination } from "./pagination";
import { ResultCard } from "./result-card";
import { ResultsMeta } from "./results-meta";
import { ResultsSkeleton } from "./results-skeleton";

const PAGE_SIZE = 10;

interface ResultsSectionProps {
  query: string;
  page: number;
  results: SearchResult[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

export function ResultsSection({
  query,
  page,
  results,
  loading,
  error,
  onRetry,
  onPageChange,
}: ResultsSectionProps) {
  if (error) {
    return (
      <>
        <div className="mb-4 text-sm text-muted" aria-live="polite">
          Search failed for{" "}
          <strong className="font-medium text-foreground">{query}</strong>
        </div>
        <ErrorState onRetry={onRetry} />
      </>
    );
  }

  if (loading && results.length === 0) {
    return (
      <>
        <ResultsMeta query={query} page={page} count={0} loading />
        <ResultsSkeleton />
      </>
    );
  }

  if (!loading && results.length === 0) {
    return (
      <>
        <ResultsMeta query={query} page={page} count={0} loading={false} />
        <EmptyState query={query} />
      </>
    );
  }

  return (
    <>
      <ResultsMeta
        query={query}
        page={page}
        count={results.length}
        loading={loading}
      />

      <div className="flex flex-col gap-3">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.url}-${index}`}
            result={result}
            query={query}
            index={index}
          />
        ))}
      </div>

      <Pagination
        page={page}
        hasMore={results.length >= PAGE_SIZE}
        loading={loading}
        onPageChange={onPageChange}
      />
    </>
  );
}

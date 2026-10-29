interface ResultsMetaProps {
  query: string;
  page: number;
  count: number;
  loading: boolean;
}

export function ResultsMeta({ query, page, count, loading }: ResultsMetaProps) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted"
      aria-live="polite"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span
            className="size-3.5 animate-spin rounded-full border-2 border-white/15 border-t-white"
            aria-hidden="true"
          />
          Searching for{" "}
          <strong className="font-medium text-foreground">{query}</strong>…
        </span>
      ) : count === 0 ? (
        <span>
          No results for{" "}
          <strong className="font-medium text-foreground">{query}</strong>
        </span>
      ) : (
        <span>
          Showing <strong className="font-medium text-foreground">{count}</strong>{" "}
          {count === 1 ? "result" : "results"} for{" "}
          <strong className="font-medium text-foreground">{query}</strong>
        </span>
      )}

      {!loading && count > 0 && (
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          Page {page}
        </span>
      )}
    </div>
  );
}

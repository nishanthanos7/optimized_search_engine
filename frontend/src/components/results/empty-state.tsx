import { SearchX } from "lucide-react";

export function EmptyState({ query }: { query: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-surface-muted text-faint">
        <SearchX className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No results for “{query}”</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Try a different spelling, a broader phrase, or fewer keywords.
      </p>
    </div>
  );
}

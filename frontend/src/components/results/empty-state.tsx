import { SearchX } from "lucide-react";

export function EmptyState({ query }: { query: string }) {
  return (
    <div className="animate-fade-up mx-auto max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center backdrop-blur-xl">
      <div className="mx-auto grid size-12 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-faint">
        <SearchX className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em]">
        No results for “{query}”
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Try a different spelling, a broader phrase, or fewer keywords.
      </p>
    </div>
  );
}

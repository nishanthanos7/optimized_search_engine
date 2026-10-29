import type { SearchResult } from "@/lib/api";
import { highlightText } from "@/lib/highlight";
import { parseUrl } from "@/lib/url";
import { EngineBadges } from "./engine-badges";
import { Favicon } from "./favicon";

interface ResultCardProps {
  result: SearchResult;
  query: string;
  index: number;
}

export function ResultCard({ result, query, index }: ResultCardProps) {
  const { hostname, pathname } = parseUrl(result.url);

  return (
    <article
      className="animate-fade-up rounded-xl border border-border bg-surface p-4 transition hover:border-accent/40 hover:shadow-sm sm:p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <Favicon url={result.url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">
            {hostname || result.url}
          </p>
          {pathname && (
            <p className="truncate text-[11px] text-faint">{pathname}</p>
          )}
        </div>
        <EngineBadges engines={result.engines} />
      </div>

      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 block text-[17px] font-semibold leading-snug text-foreground underline-offset-2 hover:text-accent hover:underline"
      >
        {highlightText(result.title || result.url, query)}
      </a>

      {result.snippet && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">
          {highlightText(result.snippet, query)}
        </p>
      )}
    </article>
  );
}

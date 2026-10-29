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
      className="group animate-fade-up relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.035] sm:p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="flex items-center gap-2.5">
        <Favicon url={result.url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">
            {hostname || result.url}
          </p>
          {pathname && (
            <p className="truncate font-mono text-[10px] text-faint">
              {pathname}
            </p>
          )}
        </div>
        <EngineBadges engines={result.engines} />
      </div>

      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 block text-[17px] font-medium leading-snug text-foreground decoration-white/40 underline-offset-4 hover:underline"
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

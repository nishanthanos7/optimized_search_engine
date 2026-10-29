import type { AiSource } from "@/lib/api";
import { Favicon } from "@/components/results/favicon";
import { parseUrl } from "@/lib/url";

export function AiSources({ sources }: { sources: AiSource[] }) {
  if (sources.length === 0) {
    return <p className="px-4 pb-4 text-xs text-faint">No sources returned.</p>;
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Sources
      </h4>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {sources.map((source, index) => {
          const { hostname } = parseUrl(source.url);

          return (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-surface-muted"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded bg-surface-muted text-[10px] font-bold text-faint">
                {index + 1}
              </span>
              <Favicon url={source.url} className="size-5 rounded" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {source.title || hostname || source.url}
                </span>
                <span className="block truncate text-[11px] text-faint">
                  {source.domain || hostname}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { CitizenSource } from "@/lib/api";
import { Favicon } from "@/components/results/favicon";
import { parseUrl } from "@/lib/url";

interface CitizenSourcesProps {
  sources: CitizenSource[];
}

export function CitizenSources({ sources }: CitizenSourcesProps) {
  if (sources.length === 0) {
    return <p className="px-4 pb-4 text-xs text-faint">No sources returned.</p>;
  }

  return (
    <div className="border-t border-white/[0.07] px-4 py-3">
      <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        Sources
      </h4>
      <div className="grid gap-1 sm:grid-cols-2">
        {sources.map((source, index) => {
          const { hostname } = parseUrl(source.url);
          return (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors duration-150 hover:border-white/10 hover:bg-white/[0.04]"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded bg-white/[0.06] font-mono text-[10px] font-semibold text-white/50">
                {index + 1}
              </span>
              <Favicon url={source.url} className="size-5 rounded" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {source.title || hostname || source.url}
                </span>
                <span className="block truncate font-mono text-[10px] text-faint">
                  {hostname}
                </span>
              </span>
              {source.stale && (
                <span className="shrink-0 rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-white/60">
                  outdated
                </span>
              )}
              {source.needs_review && (
                <span className="shrink-0 rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-white/60">
                  under review
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SearchBar } from "@/components/search/search-bar";
import { buildSearchUrl } from "@/lib/search-url";

const EXAMPLES = [
  "quantum computing",
  "best coffee in Kathmandu",
  "Next.js 16 features",
  "how do LLMs work",
];

export function HomeView() {
  const router = useRouter();

  const handleSearch = useCallback(
    (query: string) => router.push(buildSearchUrl(query)),
    [router],
  );

  return (
    <AppShell>
      <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          <Logo size="lg" className="justify-center" />

          <h1 className="mt-7 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            One search. Every source.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted sm:text-base">
            Search DuckDuckGo, Bing and Wikipedia at once — then let Nova AI
            answer with citations.
          </p>

          <SearchBar
            size="lg"
            autoFocus
            onSearch={handleSearch}
            className="mt-8"
          />

          <p className="mt-4 text-xs text-faint">
            Press{" "}
            <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-sans text-[11px] text-muted">
              /
            </kbd>{" "}
            to focus · 3 engines, one query
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleSearch(example)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-faint">
        Nova · Metasearch + AI
      </footer>
    </AppShell>
  );
}

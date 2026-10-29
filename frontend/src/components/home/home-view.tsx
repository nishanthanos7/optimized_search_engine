"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Intro } from "@/components/brand/intro";
import { Logo } from "@/components/brand/logo";
import { AppShell } from "@/components/layout/app-shell";
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
    <AppShell className="overflow-hidden">
      <Intro />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size="sm" />
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
          Metasearch + AI
        </span>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 sm:pt-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none"
        >
          <p className="hero-outline animate-drift text-center text-[26vw] font-semibold leading-none tracking-[-0.06em] sm:text-[21vw]">
            INDEX
          </p>
        </div>

        <div className="relative z-10 w-full max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted backdrop-blur-xl">
            <span
              className="size-1.5 rounded-full bg-white/80 shadow-[0_0_10px_2px_rgba(255,255,255,0.45)]"
              aria-hidden="true"
            />
            DuckDuckGo · Bing · Wikipedia
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
            Search once.
            <br />
            <span className="text-muted">Understand everything.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-pretty text-sm leading-relaxed text-muted sm:text-base">
            Index queries three engines at once, then writes a cited answer from
            the best sources it finds.
          </p>

          <SearchBar
            size="lg"
            autoFocus
            onSearch={handleSearch}
            className="mt-8"
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleSearch(example)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-muted transition-colors duration-150 hover:border-white/25 hover:bg-white/[0.06] hover:text-foreground"
              >
                {example}
                <ArrowUpRight className="size-3 text-faint transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            ))}
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Press / to focus
          </p>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-[11px] text-faint sm:flex-row">
          <span className="font-mono uppercase tracking-[0.22em]">Index</span>
          <span>Metasearch + AI · Built for speed</span>
        </div>
      </footer>
    </AppShell>
  );
}

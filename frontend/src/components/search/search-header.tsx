"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";

interface SearchHeaderProps {
  query: string;
  aiEnabled: boolean;
  showAi?: boolean;
  onSearch: (query: string) => void;
  onToggleAi: () => void;
}

export function SearchHeader({
  query,
  aiEnabled,
  showAi = true,
  onSearch,
  onToggleAi,
}: SearchHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3">
        <Link
          href="/"
          className="shrink-0 rounded-lg p-0.5"
          aria-label="Nova home"
        >
          <Logo size="sm" withText={false} />
        </Link>

        <SearchBar
          key={query}
          initialQuery={query}
          onSearch={onSearch}
          className="order-3 w-full sm:order-none sm:flex-1"
        />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          {showAi && (
            <Button
              type="button"
              variant={aiEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggleAi}
              aria-pressed={aiEnabled}
              title={aiEnabled ? "Turn off AI Mode" : "Turn on AI Mode"}
              className="gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>AI</span>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

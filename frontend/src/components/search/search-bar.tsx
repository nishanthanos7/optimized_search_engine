"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { useSearchBox } from "@/hooks/use-search-box";
import { cn } from "@/lib/utils";
import { SuggestionsList } from "./suggestions-list";

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
  size?: "lg" | "md";
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  initialQuery = "",
  onSearch,
  autoFocus = false,
  size = "md",
  placeholder = "Search the web…",
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const box = useSearchBox({
    initialQuery,
    onSearch,
    autoFocus,
    inputRef,
    containerRef,
  });
  const isLarge = size === "lg";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={box.handleSubmit}
        className={cn(
          "flex items-center gap-2.5 rounded-2xl border border-border bg-surface shadow-sm transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-[var(--ring)]",
          isLarge ? "h-14 px-4 md:h-16 md:px-5" : "h-11 px-3.5",
        )}
      >
        <Search
          className={cn("shrink-0 text-faint", isLarge ? "size-5" : "size-4")}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={box.value}
          onChange={box.handleChange}
          onKeyDown={box.handleKeyDown}
          onFocus={box.handleFocus}
          onBlur={box.handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={box.showSuggestions}
          aria-controls={box.listId}
          aria-autocomplete="list"
          aria-activedescendant={
            box.showSuggestions && box.highlightedIndex >= 0
              ? `${box.listId}-option-${box.highlightedIndex}`
              : undefined
          }
          aria-label="Search the web"
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint",
            isLarge ? "text-base md:text-lg" : "text-sm",
          )}
        />
        {box.value && (
          <button
            type="button"
            onClick={box.handleClear}
            className="grid size-6 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className={cn(
            "grid shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm transition hover:bg-accent/90 active:scale-95",
            isLarge ? "size-10 md:size-11" : "size-8",
          )}
        >
          <Search className={isLarge ? "size-5" : "size-4"} />
        </button>
      </form>

      <SuggestionsList
        id={box.listId}
        open={box.showSuggestions}
        suggestions={box.suggestions}
        activeIndex={box.highlightedIndex}
        onSelect={box.handleSelect}
        onHover={box.setActiveIndex}
      />
    </div>
  );
}

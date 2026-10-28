"use client";

import { useCallback, useRef, useState, forwardRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuggestionsDropdown } from "./suggestions-dropdown";

interface SearchBarProps {
  query: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear: () => void;
  suggestions: string[];
  suggestionsOpen: boolean;
  handleSuggestionSelect: (suggestion: string) => void;
  setSuggestionsOpen: (open: boolean) => void;
}

const SearchBarComponent = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      query,
      onInputChange,
      onSubmit,
      onClear,
      suggestions,
      suggestionsOpen,
      handleSuggestionSelect,
      setSuggestionsOpen,
    }: SearchBarProps,
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const anchorRef = useRef<HTMLDivElement | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const handleFocus = () => {
      if (query.trim() && suggestions.length > 0) {
        setSuggestionsOpen(true);
      }
    };

    const handleBlur = () => {
      // Give the dropdown's mousedown handler a chance to run before closing.
      setTimeout(() => setSuggestionsOpen(false), 120);
    };

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!suggestionsOpen) return;
        if (e.key === "Escape") {
          setSuggestionsOpen(false);
          setHighlightedIndex(-1);
          return;
        }
        if (e.key === "Enter" && highlightedIndex >= 0) {
          e.preventDefault();
          handleSuggestionSelect(suggestions[highlightedIndex]);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedIndex((i) =>
            i >= suggestions.length - 1 ? i : i + 1
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedIndex((i) => (i <= 0 ? -1 : i - 1));
          return;
        }
      },
      [suggestions, suggestionsOpen, highlightedIndex, handleSuggestionSelect, setSuggestionsOpen]
    );

    const handleSuggestion = (suggestion: string) => {
      handleSuggestionSelect(suggestion);
      inputRef.current?.focus();
      setHighlightedIndex(-1);
    };

    return (
      <div className="search-wrapper relative w-full max-w-[720px]">
        <form onSubmit={onSubmit} className="w-full">
          <div
            ref={anchorRef}
            className="search-box flex items-center gap-3 px-4 py-2 bg-surface border border-border rounded-[20px] shadow-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <span className="text-gray-400 flex items-center">
              <Search size={21} strokeWidth={2} />
            </span>
            <input
              ref={(node) => {
                inputRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
              }}
              type="text"
              value={query}
              onChange={onInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Search the web..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-text font-normal text-[17px] placeholder:text-text-faint dark:text-text dark:placeholder:text-gray-500"
              aria-label="Search the web"
            />
            {query ? (
              <button
                type="button"
                onClick={onClear}
                className="w-7 h-7 rounded-full text-text-faint hover:text-text hover:bg-surface-2 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                aria-label="Clear search"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            ) : null}
            <Button type="submit" size="icon" className="h-10 w-10 rounded-[14px] bg-black text-white shadow-lg hover:brightness-106 active:scale-95 transition-all dark:bg-white dark:text-black">
              <Search size={20} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
            </Button>
          </div>
          <SuggestionsDropdown
            suggestions={suggestions}
            open={suggestionsOpen}
            highlightedIndex={highlightedIndex}
            onSelect={handleSuggestion}
            onClose={() => setSuggestionsOpen(false)}
            anchorRef={anchorRef}
          />
        </form>
      </div>
    );
  },
);

SearchBarComponent.displayName = "SearchBar";

export { SearchBarComponent as SearchBar };

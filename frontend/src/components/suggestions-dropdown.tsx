"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestionsDropdownProps {
  suggestions: string[];
  open: boolean;
  highlightedIndex: number;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

export function SuggestionsDropdown({
  suggestions,
  open,
  highlightedIndex,
  onSelect,
  onClose,
  anchorRef,
}: SuggestionsDropdownProps) {
  const listRef = useRef<HTMLUListElement | null>(null);

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    onClose();
  };

  // Scroll the highlighted option into view.
  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const list = listRef.current;
    const option = list?.querySelectorAll("li")[highlightedIndex];
    if (!option || !list) return;
    const optionBottom = option.offsetTop + option.offsetHeight;
    const listBottom = list.offsetTop + list.offsetHeight;
    if (optionBottom > listBottom + list.scrollTop) {
      list.scrollTop = optionBottom - list.offsetHeight;
    } else if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    }
  }, [open, highlightedIndex]);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    const handleMousedown = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      const list = listRef.current;
      if (anchor && !anchor.contains(e.target as Node)) {
        onClose();
      }
      if (list && !list.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMousedown);
    return () => document.removeEventListener("mousedown", handleMousedown);
  }, [open, anchorRef, onClose]);

  if (!open || suggestions.length === 0) return null;

  return (
    <div ref={anchorRef} className="relative inline-block">
      <ul
        ref={listRef}
        role="listbox"
        aria-label="Search suggestions"
        className={cn(
          "absolute z-30 mt-2 w-full max-w-[720px] rounded-[16px] border border-border bg-surface shadow-2xl dark:border-gray-600 dark:bg-gray-800",
          "animate-dropIn"
        )}
      >
        {suggestions.map((suggestion, index) => {
          const isHighlighted = index === highlightedIndex;
          return (
            <li
              key={suggestion}
              role="option"
              aria-selected={isHighlighted}
              id={`suggestion-${index}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm text-text transition-colors",
                isHighlighted
                  ? "bg-surface-2 dark:bg-gray-700"
                  : "hover:bg-surface-2 dark:hover:bg-gray-700"
              )}
            >
              <span className="text-text-faint flex items-center w-4 h-4 shrink-0">
                <Search size={14} strokeWidth={2} className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0 truncate">{suggestion}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

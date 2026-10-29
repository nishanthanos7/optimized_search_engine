"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestionsListProps {
  id: string;
  open: boolean;
  suggestions: string[];
  activeIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}

export function SuggestionsList({
  id,
  open,
  suggestions,
  activeIndex,
  onSelect,
  onHover,
}: SuggestionsListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    const option = list?.querySelectorAll<HTMLElement>("[role='option']")[
      activeIndex
    ];
    if (!list || !option) return;

    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    } else if (top < list.scrollTop) {
      list.scrollTop = top;
    }
  }, [open, activeIndex]);

  if (!open) return null;

  return (
    <ul
      ref={listRef}
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="animate-fade-up absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl"
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={suggestion}
          id={`${id}-option-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(suggestion);
          }}
          onMouseEnter={() => onHover(index)}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            index === activeIndex
              ? "bg-surface-muted text-foreground"
              : "text-muted hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <Search className="size-3.5 shrink-0 text-faint" />
          <span className="truncate">{suggestion}</span>
        </li>
      ))}
    </ul>
  );
}

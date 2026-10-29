"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { RefObject } from "react";
import { useSuggestions } from "./use-suggestions";

interface UseSearchBoxOptions {
  initialQuery?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useSearchBox({
  initialQuery = "",
  onSearch,
  autoFocus = false,
  inputRef,
  containerRef,
}: UseSearchBoxOptions) {
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const suggestions = useSuggestions(value);
  const showSuggestions = open && suggestions.length > 0;
  const highlightedIndex =
    activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : -1;

  useEffect(() => {
    if (!autoFocus) return;
    const desktop = window.matchMedia("(min-width: 640px)").matches;
    if (desktop) inputRef.current?.focus();
  }, [autoFocus, inputRef]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [inputRef]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, containerRef]);

  const submit = useCallback(
    (raw: string) => {
      const query = raw.trim();
      if (!query) return;
      setOpen(false);
      setActiveIndex(-1);
      onSearch(query);
    },
    [onSearch],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit(value);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        index < 0 || index >= suggestions.length
          ? 0
          : (index + 1) % suggestions.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 || index >= suggestions.length
          ? suggestions.length - 1
          : index - 1,
      );
    } else if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      submit(suggestions[highlightedIndex]);
    }
  };

  const handleSelect = (suggestion: string) => {
    setValue(suggestion);
    submit(suggestion);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setValue("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (value.trim()) setOpen(true);
  };

  const handleBlur = () => {
    window.setTimeout(() => setOpen(false), 120);
  };

  return {
    value,
    suggestions,
    showSuggestions,
    highlightedIndex,
    listId,
    setActiveIndex,
    handleSubmit,
    handleChange,
    handleKeyDown,
    handleSelect,
    handleClear,
    handleFocus,
    handleBlur,
  };
}

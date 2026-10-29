"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
  value: "ne" | "en";
  onChange: (value: "ne" | "en") => void;
}

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  const setEnglish = useCallback(() => onChange("en"), [onChange]);
  const setNepali = useCallback(() => onChange("ne"), [onChange]);

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-0.5 backdrop-blur-xl"
      role="radiogroup"
      aria-label="Answer language"
    >
      <Button
        type="button"
        variant={value === "ne" ? "default" : "ghost"}
        size="xs"
        onClick={setNepali}
        aria-pressed={value === "ne"}
      >
        नेपाली
      </Button>
      <Button
        type="button"
        variant={value === "en" ? "default" : "ghost"}
        size="xs"
        onClick={setEnglish}
        aria-pressed={value === "en"}
      >
        English
      </Button>
    </div>
  );
}

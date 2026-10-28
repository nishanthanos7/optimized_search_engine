"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const applyTheme = useCallback((next: "light" | "dark") => {
    setTheme(next);
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = next;
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try { localStorage.setItem("theme", next); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: "light" | "dark" =
      saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "dark";
    // The preference is only available after hydration; the server renders light.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        applyTheme(e.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [applyTheme]);

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  return (
    <Button
      onClick={toggle}
      variant="outline"
      size="icon"
      className={cn(
        "fixed top-[18px] right-[18px] z-[100] h-10 w-10 rounded-lg border bg-popover text-popover-foreground shadow-lg backdrop-blur-md",
      )}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const STORAGE_KEY = "index:intro-seen";

type Phase = "hidden" | "show" | "exit";

export function Intro() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage can be unavailable; the intro is non-essential.
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Schedule on the next frame so the entrance animation actually plays and
    // we don't set state synchronously inside the effect.
    window.requestAnimationFrame(() => setPhase("show"));
    // No cleanup: StrictMode re-runs this effect but the session flag above
    // makes the second pass a no-op, so the timers must survive.
    window.setTimeout(() => setPhase("exit"), 1450);
    window.setTimeout(() => setPhase("hidden"), 1900);
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn("intro-overlay", phase === "exit" && "is-exit")}
      aria-hidden="true"
    >
      <div className="intro-beam" />
      <div className="intro-word flex flex-col items-center gap-5">
        <Logo size="lg" />
        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/35">
          Metasearch + AI
        </span>
      </div>
    </div>
  );
}

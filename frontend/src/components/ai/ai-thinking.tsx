export function AiThinking() {
  return (
    <div
      className="relative overflow-hidden px-4 py-6 sm:px-5"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <span className="orb" aria-hidden="true">
          <span className="orb-ring" />
          <span className="orb-ring orb-ring-2" />
          <span className="orb-core" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="shimmer-text text-sm font-medium tracking-[-0.01em]">
            Reading top sources…
          </p>
          <p className="mt-1 text-xs text-faint">
            Cross-checking DuckDuckGo, Bing and Wikipedia
          </p>
        </div>

        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-faint sm:block">
          Drafting
        </span>
      </div>

      <div
        className="mt-5 h-px w-full overflow-hidden bg-white/[0.08]"
        aria-hidden="true"
      >
        <span className="thinking-bar block h-full w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>
    </div>
  );
}

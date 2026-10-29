export function AiThinking() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-5 text-sm text-muted"
      aria-live="polite"
    >
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 animate-pulse rounded-full bg-accent"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </span>
      Reading top results and drafting an answer…
    </div>
  );
}

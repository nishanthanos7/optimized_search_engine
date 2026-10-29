import { cn } from "@/lib/utils";

function engineKey(engine: string): string {
  const value = engine.toLowerCase();
  if (value.includes("duck")) return "duckduckgo";
  if (value.includes("bing")) return "bing";
  if (value.includes("wiki")) return "wikipedia";
  return "default";
}

const DOTS: Record<string, string> = {
  duckduckgo: "bg-orange-400/80",
  bing: "bg-sky-400/80",
  wikipedia: "bg-zinc-300/80",
  default: "bg-white/60",
};

export function EngineBadges({ engines }: { engines: string[] }) {
  if (!engines?.length) return null;

  return (
    <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
      {engines.map((engine) => {
        const key = engineKey(engine);

        return (
          <span
            key={engine}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white/45"
          >
            <span
              className={cn("size-1 rounded-full", DOTS[key] ?? DOTS.default)}
              aria-hidden="true"
            />
            {engine}
          </span>
        );
      })}
    </div>
  );
}

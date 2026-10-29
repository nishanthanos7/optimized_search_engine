import { cn } from "@/lib/utils";

const ENGINE_STYLES: Record<string, string> = {
  duckduckgo: "border-orange-400/30 bg-orange-400/10 text-orange-400",
  bing: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  wikipedia: "border-violet-400/30 bg-violet-400/10 text-violet-400",
};

function engineKey(engine: string): string {
  const value = engine.toLowerCase();
  if (value.includes("duck")) return "duckduckgo";
  if (value.includes("bing")) return "bing";
  if (value.includes("wiki")) return "wikipedia";
  return "default";
}

export function EngineBadges({ engines }: { engines: string[] }) {
  if (!engines?.length) return null;

  return (
    <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
      {engines.map((engine) => (
        <span
          key={engine}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            ENGINE_STYLES[engineKey(engine)] ??
              "border-accent/30 bg-accent-soft text-accent",
          )}
        >
          {engine}
        </span>
      ))}
    </div>
  );
}

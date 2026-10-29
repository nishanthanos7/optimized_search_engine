import type { ReactNode } from "react";
import type { AiSource } from "@/lib/api";

function renderInline(text: string, sources: AiSource[]): ReactNode {
  const parts = text.split(/(\[\d+\]|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const citation = part.match(/^\[(\d+)\]$/);
    if (citation) {
      const number = Number(citation[1]);
      const source = sources[number - 1];
      if (!source) return part;

      return (
        <a
          key={index}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.title}
          className="mx-0.5 inline-flex size-4 -translate-y-0.5 items-center justify-center rounded bg-white/10 align-middle font-mono text-[10px] font-semibold text-white/70 transition-colors hover:bg-white hover:text-black"
        >
          {number}
        </a>
      );
    }

    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {bold[1]}
        </strong>
      );
    }

    return part;
  });
}

interface AiAnswerProps {
  text: string;
  sources: AiSource[];
  streaming: boolean;
}

export function AiAnswer({ text, sources, streaming }: AiAnswerProps) {
  // The model appends its own plain-text source list; the panel already has a
  // richer sources section, so drop the duplicate tail.
  const body = text.replace(/\n+\s*(?:\*\*)?Sources:(?:\*\*)?\s*\n[\s\S]*$/i, "");
  const blocks = body.split(/\n{2,}/).filter((block) => block.trim());

  return (
    <div
      className="space-y-3 text-[15px] leading-7 text-[#d4d4d4]"
      aria-live="polite"
    >
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*[-*•]\s+/.test(line));

        if (isList) {
          return (
            <ul
              key={index}
              className="list-disc space-y-1.5 pl-5 marker:text-white/30"
            >
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {renderInline(
                    line.replace(/^\s*[-*•]\s+/, ""),
                    sources,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(block, sources)}
          </p>
        );
      })}

      {streaming && (
        <span
          className="cursor-blink ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-white"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

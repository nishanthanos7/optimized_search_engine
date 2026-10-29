"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { CitizenAnswerPanel } from "./citizen-answer";
import type { CitizenServiceDisplay } from "@/lib/citizen/services";

interface ServicePageViewProps {
  service: CitizenServiceDisplay;
}

export function ServicePageView({ service }: ServicePageViewProps) {
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const handleSearch = useCallback(
    (query: string) => {
      setSubmittedQuery(query);
    },
    [],
  );

  const handleSelectQuestion = useCallback(
    (question: string) => {
      setSubmittedQuery(question);
    },
    [],
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-faint transition-colors hover:text-foreground hover:border-white/10"
        >
          <ArrowLeft className="size-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            Back to home
          </span>
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-semibold tracking-[-0.03em]">
        {service.name}
      </h1>
      <p className="mb-6 text-sm text-muted">{service.nameNe}</p>
      <p className="mb-6 text-sm text-foreground">{service.description}</p>

      <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs text-faint">
        <p className="mb-1 font-mono uppercase tracking-[0.14em] text-white/70">
          Scope
        </p>
        <p>
          National guidance from official sources. Your local office may require
          different documents or charge different fees.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          Common questions
        </h2>
        <div className="flex flex-wrap gap-2">
          {service.questions.map((question, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectQuestion(question)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-muted transition-colors duration-150 hover:border-white/25 hover:bg-white/[0.06] hover:text-foreground"
            >
              {question}
              <ArrowRight className="size-3 text-faint transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar
          size="md"
          placeholder={`Ask about ${service.name}…`}
          ariaLabel={`Ask about ${service.name}`}
          onSearch={handleSearch}
          className="mt-4"
        />
      </div>

      {submittedQuery && (
        <div className="mt-6 w-full">
          <CitizenAnswerPanel
            query={submittedQuery}
            service={service.slug}
            language="en"
            onRetry={() => {
              setSubmittedQuery(null);
            }}
          />
        </div>
      )}

      <div className="mt-8 border-t border-white/[0.07] pt-6">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          Official sources
        </h3>
        <div className="flex flex-wrap gap-3">
          {service.officialSources.map((sourceUrl, index) => {
            const url = new URL(sourceUrl);
            return (
              <a
                key={index}
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors duration-150 hover:border-white/10 hover:bg-white/[0.04]"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded bg-white/[0.06] font-mono text-[10px] font-semibold text-white/50">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {url.hostname}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-faint">
                    {sourceUrl}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-xs text-faint">
        AI summary. Confirm fees and documents with the office.
      </p>
    </div>
  );
}

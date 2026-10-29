"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Intro } from "@/components/brand/intro";
import { Logo } from "@/components/brand/logo";
import { AppShell } from "@/components/layout/app-shell";
import { SearchBar } from "@/components/search/search-bar";
import { LanguageToggle } from "./language-toggle";
import { ServiceChips } from "./service-chips";
import { CitizenAnswerPanel } from "./citizen-answer";
import { getCitizenService } from "@/lib/citizen/services";

interface CitizenQuestionChipProps {
  question: string;
  onSelect: (q: string) => void;
}

function CitizenQuestionChip({ question, onSelect }: CitizenQuestionChipProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(question)}
      className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-muted transition-colors duration-150 hover:border-white/25 hover:bg-white/[0.06] hover:text-foreground"
    >
      {question}
      <ArrowUpRight className="size-3 text-faint transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  );
}

export function CitizenHome() {
  const [language, setLanguage] = useState<"ne" | "en">("ne");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const handleSearch = useCallback(
    (query: string) => {
      setSubmittedQuery(query);
    },
    [],
  );

  const handleSelectService = useCallback(
    (slug: string) => {
      setSelectedService(slug);
      const service = getCitizenService(slug);
      if (service?.questions[0]) {
        setSubmittedQuery(service.questions[0]);
      }
    },
    [],
  );

  const handleSelectQuestion = useCallback(
    (question: string) => {
      setSubmittedQuery(question);
    },
    [],
  );

  const service = selectedService ? getCitizenService(selectedService) : null;

  return (
    <AppShell className="overflow-hidden">
      <Intro />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size="sm" />
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
          Official sources · Nepal
        </span>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 sm:pt-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none"
        >
          <p className="hero-outline animate-drift text-center text-[26vw] font-semibold leading-none tracking-[-0.06em] sm:text-[21vw]">
            INDEX
          </p>
        </div>

        <div className="relative z-10 w-full max-w-2xl text-center">
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl">
            Nepal&rsquo;s government, explained.
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-pretty text-sm leading-relaxed text-muted sm:text-base">
            Ask about passports, driving licences, citizenship, birth and
            marriage registration. Answers come only from official Government
            of Nepal sources, with citations and a source-checked date.
          </p>

          <SearchBar
            size="lg"
            autoFocus
            placeholder="What do you need help with?"
            ariaLabel="Ask about a Nepal government service"
            onSearch={handleSearch}
            className="mt-8"
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <LanguageToggle value={language} onChange={setLanguage} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <ServiceChips selected={selectedService} onSelect={handleSelectService} />
          </div>

          {service && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {service.questions.map((question, index) => (
                <CitizenQuestionChip
                  key={index}
                  question={question}
                  onSelect={handleSelectQuestion}
                />
              ))}
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            <span className="relative flex h-[1px] flex-1 bg-white/10" />
            <span className="px-1.5 bg-black">Trust strip</span>
            <span className="relative flex h-[1px] flex-1 bg-white/10" />
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Official sources · Source checked date · Nepali & English
          </p>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Press / to focus
          </p>
        </div>

        {submittedQuery && (
          <div className="mt-8 w-full max-w-2xl">
            <CitizenAnswerPanel
              query={submittedQuery}
              service={selectedService}
              language={language}
              onRetry={() => {
                setSubmittedQuery(null);
              }}
            />
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-[11px] text-faint sm:flex-row">
          <span className="font-mono uppercase tracking-[0.22em]">Index</span>
          <div className="flex items-center gap-4">
            <a
              href="/search"
              className="text-muted hover:text-foreground transition-colors"
            >
              Web search
            </a>
            <span className="text-faint">·</span>
            <span>AI summary. Confirm fees and documents with the office.</span>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}

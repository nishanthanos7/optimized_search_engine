"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_WINDOW = 5;

interface PaginationProps {
  page: number;
  hasMore: boolean;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  hasMore,
  loading,
  onPageChange,
}: PaginationProps) {
  const start = Math.max(1, page - Math.floor(PAGE_WINDOW / 2));
  const pages = Array.from(
    { length: PAGE_WINDOW },
    (_, index) => start + index,
  );

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5 border-t border-border pt-6"
      aria-label="Search results pages"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || loading}
        className="gap-1"
      >
        <ChevronLeft className="size-3.5" />
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === page ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(pageNumber)}
            disabled={loading}
            aria-current={pageNumber === page ? "page" : undefined}
            className="w-9 px-0"
          >
            {pageNumber}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore || loading}
        className="gap-1"
      >
        Next
        <ChevronRight className="size-3.5" />
      </Button>
    </nav>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { SearchViewSkeleton } from "@/components/search/search-view-skeleton";

export const metadata: Metadata = {
  title: "Search — Index",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchViewSkeleton />}>
      <SearchView />
    </Suspense>
  );
}

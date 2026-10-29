import { AppShell } from "@/components/layout/app-shell";

export function SearchViewSkeleton() {
  return (
    <AppShell>
      <header className="border-b border-border/80">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
          <div className="skeleton size-7 rounded-lg" />
          <div className="skeleton h-11 flex-1 rounded-2xl" />
          <div className="skeleton size-8 rounded-lg" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-5">
        <div className="skeleton mb-4 h-4 w-64 rounded" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton mt-2 h-3 w-full rounded" />
              <div className="skeleton mt-1.5 h-3 w-5/6 rounded" />
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="skeleton size-8 rounded-lg" />
            <div className="flex-1">
              <div className="skeleton h-3 w-40 rounded" />
              <div className="skeleton mt-1.5 h-2.5 w-24 rounded" />
            </div>
          </div>
          <div className="skeleton mt-3 h-4 w-3/4 rounded" />
          <div className="skeleton mt-2 h-3 w-full rounded" />
          <div className="skeleton mt-1.5 h-3 w-5/6 rounded" />
        </div>
      ))}
    </div>
  );
}

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="animate-fade-up mx-auto max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center backdrop-blur-xl">
      <div className="mx-auto grid size-12 place-items-center rounded-xl border border-danger/25 bg-danger/10 text-danger">
        <AlertCircle className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em]">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We couldn&apos;t reach the search service. Check that the backend is
        running, then try again.
      </p>
      <Button onClick={onRetry} className="mt-5">
        Try again
      </Button>
    </div>
  );
}

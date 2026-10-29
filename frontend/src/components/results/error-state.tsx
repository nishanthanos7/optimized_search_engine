import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
        <AlertCircle className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Something went wrong</h2>
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

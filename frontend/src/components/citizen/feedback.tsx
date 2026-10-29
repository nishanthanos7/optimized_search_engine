"use client";

import { useCallback, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendCitizenFeedback } from "@/lib/api";

interface FeedbackProps {
  query: string;
  service: string | null;
}

export function Feedback({ query, service }: FeedbackProps) {
  const [sent, setSent] = useState<boolean | null>(null);

  const handleVote = useCallback(
    async (helpful: boolean) => {
      try {
        await sendCitizenFeedback({ query, service, helpful });
        setSent(true);
      } catch {
        setSent(false);
      }
    },
    [query, service],
  );

  if (sent === true) {
    return (
      <div className="flex items-center gap-2 text-xs text-faint">
        <span className="font-mono uppercase tracking-[0.14em]">Thanks</span>
      </div>
    );
  }

  if (sent === false) {
    return (
      <div className="flex items-center gap-2 text-xs text-faint">
        <span className="font-mono uppercase tracking-[0.14em]">Couldn&apos;t send feedback.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => handleVote(true)}
        aria-label="Mark helpful"
      >
        <ThumbsUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => handleVote(false)}
        aria-label="Mark not helpful"
      >
        <ThumbsDown className="size-4" />
      </Button>
    </div>
  );
}

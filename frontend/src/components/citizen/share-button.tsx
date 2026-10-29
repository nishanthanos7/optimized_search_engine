"use client";

import { Share2 } from "lucide-react";

interface ShareButtonProps {
  text: string;
  url: string;
}

export function ShareButton({ text, url }: ShareButtonProps) {
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${text.trim()}\n\n${url}`,
  )}`;

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors duration-150 hover:border-white/10 hover:bg-white/[0.04]"
      aria-label="Share on WhatsApp"
    >
      <Share2 className="size-4 text-faint" />
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        WhatsApp
      </span>
    </a>
  );
}

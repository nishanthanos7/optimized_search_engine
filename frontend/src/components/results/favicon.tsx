"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { faviconUrl, parseUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

interface FaviconProps {
  url: string;
  className?: string;
}

export function Favicon({ url, className }: FaviconProps) {
  const [failed, setFailed] = useState(false);
  const { hostname } = parseUrl(url);
  const src = faviconUrl(url);
  const fallback = hostname.charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-muted text-[11px] font-bold text-faint",
        className,
      )}
      aria-hidden="true"
    >
      {!failed && src ? (
        <img
          src={src}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

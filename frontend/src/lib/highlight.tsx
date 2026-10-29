import type { ReactNode } from "react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap query terms in <mark> without using dangerouslySetInnerHTML. */
export function highlightText(text: string, query: string): ReactNode {
  const source = text ?? "";
  const terms = Array.from(
    new Set(
      (query.toLowerCase().match(/[\p{L}\p{N}-]+/gu) ?? []).filter(
        (term) => term.length > 1,
      ),
    ),
  ).sort((a, b) => b.length - a.length);

  if (terms.length === 0) return source;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");

  return source
    .split(pattern)
    .map((part, index) =>
      index % 2 === 1 ? <mark key={index}>{part}</mark> : part,
    );
}

export function buildSearchUrl(
  query: string,
  page = 1,
  aiEnabled = false,
): string {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set("page", String(page));
  if (aiEnabled) params.set("ai", "1");
  return `/search?${params.toString()}`;
}

export function parsePage(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

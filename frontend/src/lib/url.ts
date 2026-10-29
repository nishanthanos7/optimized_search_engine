export interface UrlParts {
  hostname: string;
  pathname: string;
  href: string;
}

export function parseUrl(value: string): UrlParts {
  try {
    const url = new URL(value);
    return {
      hostname: url.hostname.replace(/^www\./i, ""),
      pathname: `${url.pathname}${url.search}`.replace(/\/$/, "") || "/",
      href: url.href,
    };
  } catch {
    return { hostname: "", pathname: "", href: value };
  }
}

export function faviconUrl(value: string): string {
  const { hostname } = parseUrl(value);
  if (!hostname) return "";
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
}

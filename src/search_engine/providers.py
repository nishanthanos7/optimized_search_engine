import asyncio
import re
from urllib.parse import parse_qsl, quote_plus, urlencode, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup
from ddgs import DDGS

HEADERS = {
    "User-Agent": "FastMetasearch/0.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def canonical_url(url: str) -> str:
    parts = urlsplit(url.strip())
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return ""

    hostname = parts.hostname.lower().removeprefix("www.")
    port = f":{parts.port}" if parts.port and parts.port not in {80, 443} else ""
    path = parts.path.rstrip("/")
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if not key.lower().startswith("utm_")
        and key.lower() not in {"fbclid", "gclid", "ref", "source"}
    ]
    return urlunsplit((parts.scheme.lower(), hostname + port, path, urlencode(sorted(query)), ""))


def rank_results(query: str, results: list[dict]) -> list[dict]:
    terms = set(re.findall(r"[\w-]+", query.lower()))
    if not terms:
        return results

    def score(result: dict) -> int:
        title = result.get("title", "").lower()
        snippet = result.get("snippet", "").lower()
        title_terms = set(re.findall(r"[\w-]+", title))
        snippet_terms = set(re.findall(r"[\w-]+", snippet))
        value = 3 * len(terms & title_terms) + len(terms & snippet_terms)
        phrase = query.strip().lower()
        if phrase and phrase in title:
            value += 2
        elif phrase and phrase in snippet:
            value += 1
        return value

    return [
        result
        for _, result in sorted(
            enumerate(results), key=lambda pair: (-score(pair[1]), pair[0])
        )
    ]


async def get_suggestions(query: str, client: httpx.AsyncClient) -> list:
    urls = [
        f"https://suggestqueries.google.com/complete/search?client=chrome&q={quote_plus(query)}",
        f"https://duckduckgo.com/ac/?q={quote_plus(query)}&type=list",
    ]
    for url in urls:
        try:
            response = await client.get(url, timeout=1.2)
            if response.status_code == 200:
                data = response.json()
                if len(data) > 1 and isinstance(data[1], list):
                    return data[1][:8]
        except Exception:
            continue
    return []


# Domains to exclude from search results (low quality, spam, etc.)
BLOCKED_DOMAINS = {"grokipedia.com", "www.grokipedia.com"}


def _is_blocked(url: str) -> bool:
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower().replace("www.", "")
        return domain in BLOCKED_DOMAINS
    except Exception:
        return False


async def search_metasearch(query: str, page: int = 1) -> list[dict]:
    async def search_backend(backend: str) -> list[dict]:
        try:
            search_results = await asyncio.to_thread(
                DDGS(timeout=4).text,
                query,
                page=page,
                max_results=12,
                backend=backend,
            )
        except Exception:
            return []

        results = []
        seen_urls = set()
        for item in search_results:
            url = item.get("href", "").strip()
            title = item.get("title", "").strip()
            snippet = item.get("body", "").strip()
            if not url or not url.startswith("http"):
                continue
            if _is_blocked(url):
                continue
            if url in seen_urls:
                continue
            seen_urls.add(url)
            # Clean title - remove site name suffixes
            clean_title = title
            for suffix in [" - Wikipedia", " - Bing", " - DuckDuckGo", " | Wikipedia"]:
                if clean_title.endswith(suffix):
                    clean_title = clean_title[: -len(suffix)].strip()
            # Truncate very long titles
            if len(clean_title) > 100:
                clean_title = clean_title[:97] + "..."
            results.append(
                {
                    "title": clean_title,
                    "url": url,
                    "snippet": snippet[:300],
                    "engines": ["DuckDuckGo" if backend == "duckduckgo" else "Bing"],
                }
            )
        return results

    # Run both backends in parallel (multi-agent).
    provider_results = await asyncio.gather(
        search_backend("bing"),
        search_backend("duckduckgo"),
    )
    results = [item for provider in provider_results for item in provider]
    if results:
        return results

    # Fallback to auto backend.
    try:
        search_results = await asyncio.to_thread(
            DDGS(timeout=4).text,
            query,
            page=page,
            max_results=12,
            backend="auto",
        )
    except Exception:
        return []

    return [
        {
            "title": item.get("title", "").strip()[:100],
            "url": item.get("href", "").strip(),
            "snippet": item.get("body", "").strip()[:300],
            "engines": ["DDGS metasearch"],
        }
        for item in search_results
        if item.get("href", "").startswith("http") and not _is_blocked(item.get("href", "").strip())
    ]


async def search_wikipedia(
    query: str, client: httpx.AsyncClient
) -> list[dict]:
    try:
        response = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": 1,
                "format": "json",
            },
            headers={"User-Agent": "FastMetasearch/1.0"},
            timeout=1.5,
        )
        if response.status_code == 200:
            items = response.json().get("query", {}).get("search", [])
            if items:
                title = items[0]["title"]
                snippet = BeautifulSoup(
                    items[0]["snippet"], "html.parser"
                ).get_text(strip=True)
                return [{
                    "title": f"{title} - Wikipedia",
                    "url": f"https://en.wikipedia.org/wiki/{quote_plus(title.replace(' ', '_'))}",
                    "snippet": snippet,
                    "engines": ["Wikipedia"],
                }]
    except Exception:
        pass
    return []

# ---------------------------------------------------------------------------
# Wikipedia Knowledge Panel API helpers
# ---------------------------------------------------------------------------
async def wiki_search(query: str, client: httpx.AsyncClient) -> dict | None:
    """Search Wikipedia and return the first result."""
    try:
        response = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": 5,
                "format": "json",
            },
            headers={"User-Agent": "FastMetasearch/1.0"},
            timeout=3.0,
        )
        if response.status_code != 200:
            return None
        data = response.json()
        items = data.get("query", {}).get("search", [])
        if not items:
            return None
        return items[0]
    except Exception:
        return None


async def wiki_page(title: str, client: httpx.AsyncClient) -> dict | None:
    """Get Wikipedia page details including extract and image."""
    try:
        response = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "prop": "extracts|pageimages",
                "exintro": 1,
                "explaintext": 1,
                "exlimit": 1,
                "titles": title,
                "format": "json",
                "pithumbsize": 200,
            },
            headers={"User-Agent": "FastMetasearch/1.0"},
            timeout=3.0,
        )
        if response.status_code != 200:
            return None
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return None
        page = list(pages.values())[0]
        return {
            "title": page.get("title", ""),
            "extract": page.get("extract", ""),
            "image": page.get("thumbnail", {}).get("source", ""),
            "pageid": page.get("pageid", ""),
        }
    except Exception:
        return None

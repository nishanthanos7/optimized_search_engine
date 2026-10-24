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


async def search_metasearch(query: str, page: int = 1) -> list[dict]:
    async def search_backend(backend: str) -> list[dict]:
        try:
            search_results = await asyncio.to_thread(
                DDGS(timeout=5).text,
                query,
                page=page,
                max_results=10,
                backend=backend,
            )
        except Exception:
            return []

        return [
            {
                "title": item.get("title", ""),
                "url": item.get("href", ""),
                "snippet": item.get("body", ""),
                "engines": ["DuckDuckGo" if backend == "duckduckgo" else "Bing"],
            }
            for item in search_results
            if item.get("href", "").startswith("http")
        ]

    provider_results = await asyncio.gather(
        search_backend("bing"),
        search_backend("duckduckgo"),
    )
    results = [item for provider in provider_results for item in provider]
    if results:
        return results

    try:
        search_results = await asyncio.to_thread(
            DDGS(timeout=5).text,
            query,
            page=page,
            max_results=10,
            backend="auto",
        )
    except Exception:
        return []

    return [
        {
            "title": item.get("title", ""),
            "url": item.get("href", ""),
            "snippet": item.get("body", ""),
            "engines": ["DDGS metasearch"],
        }
        for item in search_results
        if item.get("href", "").startswith("http")
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
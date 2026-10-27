"""AI Mode search — fast, grounded answers from 3-5 sources.

Multi-agent architecture:
- Agent 1: Search snippets → optimistic instant answer
- Agent 2: Parallel page fetch (3-5 sources) + NVIDIA LLM → upgraded answer
- Agent 3: Cache → repeat queries instant

Speed tricks:
- 3-5 pages fetched in parallel (asyncio.gather)
- Short timeouts (1.2s per page)
- Minimal content per page (500 chars)
- LLM max_tokens=400 for fast generation
- Optimistic UI: snippets stream immediately, LLM upgrades in background
"""

import asyncio
import logging
import re
import time
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from .llm import get_provider, provider_name
from .providers import search_metasearch

logger = logging.getLogger("search_engine.ai_search")

# ---------------------------------------------------------------------------
# AI answer cache (instant repeat queries)
# ---------------------------------------------------------------------------
AI_CACHE: dict[str, tuple[float, str, list]] = {}
AI_CACHE_TTL = 900  # 15 minutes
AI_CACHE_MAX = 200


def _cache_get(key: str):
    if key in AI_CACHE:
        ts, answer, sources = AI_CACHE[key]
        if time.time() - ts < AI_CACHE_TTL:
            return answer, sources
        del AI_CACHE[key]
    return None


def _cache_set(key: str, answer: str, sources: list):
    if len(AI_CACHE) > AI_CACHE_MAX:
        AI_CACHE.clear()
    AI_CACHE[key] = (time.time(), answer, sources)


# ---------------------------------------------------------------------------
# HTML → text
# ---------------------------------------------------------------------------
def clean_html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(
        ["script", "style", "nav", "footer", "header", "aside",
         "noscript", "iframe", "svg", "form"]
    ):
        tag.decompose()
    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(role="main")
        or soup
    )
    text = main.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Page fetching — parallel, fast, minimal
# ---------------------------------------------------------------------------
async def fetch_page_text(client, url: str, max_chars: int = 500) -> str:
    try:
        response = await client.get(url, timeout=1.2)
        if response.status_code != 200:
            return ""
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type:
            return ""
        html = response.text
        text = clean_html_to_text(html)
        if len(text) > max_chars:
            text = text[:max_chars] + "…"
        return text
    except Exception:
        return ""


async def gather_page_contents(client, results: list[dict], max_pages: int = 5):
    """Fetch 3-5 pages in parallel. Returns list of source dicts."""
    sources = []
    seen_domains = set()

    async def _fetch_one(item: dict):
        url = item.get("url", "")
        if not url:
            return None
        try:
            domain = urlparse(url).netloc.lower().replace("www.", "")
        except Exception:
            return None
        if not domain or domain in seen_domains:
            return None
        seen_domains.add(domain)

        text = await fetch_page_text(client, url)
        if not text:
            return None

        return {
            "title": item.get("title") or url,
            "url": url,
            "domain": domain,
            "content": text,
        }

    # Fetch up to max_pages*2 candidates in parallel.
    tasks = [_fetch_one(item) for item in results[: max_pages * 2]]
    fetched = await asyncio.gather(*tasks)

    for src in fetched:
        if src is not None and len(sources) < max_pages:
            sources.append(src)

    return sources


# ---------------------------------------------------------------------------
# Prompt building (compact)
# ---------------------------------------------------------------------------
def build_grounded_prompt(query: str, sources: list[dict]) -> str:
    lines = [f"Q: {query}\n", "Sources:\n"]
    for idx, src in enumerate(sources, start=1):
        lines.append(
            f"[{idx}] {src['title']} | {src['url']}\n"
            f"    {src['content']}\n"
        )
    lines.append(
        "\nAnswer briefly using ONLY sources above. Cite [n]. "
        "End with short Sources list."
    )
    return "\n".join(lines)


def build_fallback_answer(query: str, results: list[dict]) -> str:
    """Build answer from search SNIPPETS (no page fetch — instant)."""
    if not results:
        return "I couldn't find any search results for your query."
    lines = [f"Based on results for “{query}”:\n"]
    for idx, item in enumerate(results[:5], start=1):
        snippet = item.get("snippet", "").strip()[:200]
        if len(item.get("snippet", "")) > 200:
            snippet += "…"
        lines.append(
            f"[{idx}] {item.get('title','')} ({item.get('url','')}): {snippet}"
        )
    if provider_name() != "none":
        lines.append(
            f"\nUpgrading to AI-generated answer via {provider_name()}…"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main stream — optimistic multi-agent
# ---------------------------------------------------------------------------
async def stream_ai_answer(query: str, client):
    """Stream a grounded answer.

    Agent 1: Search snippets → optimistic answer (streams immediately)
    Agent 2: Parallel page fetch (3-5) + NVIDIA LLM → upgraded answer
    Cache: repeat queries are instant
    """
    cache_key = query.lower().strip()

    # --- Fast path: cache hit ---
    cached = _cache_get(cache_key)
    if cached is not None:
        answer, sources = cached
        for i in range(0, len(answer), 40):
            yield answer[i : i + 40]
            await asyncio.sleep(0)
        yield {"__sources__": sources}
        return

    # --- Slow path ---
    # Agent 1: Search (get snippets immediately).
    results = await search_metasearch(query, page=1)
    if not results:
        yield "I couldn't find any search results for your query."
        return

    # Agent 1: Optimistic answer from snippets — NO page fetch, streams instantly.
    fallback = build_fallback_answer(query, results)
    llm_ok = get_provider() is not None

    final_answer_parts = []
    sources_for_cache = []
    upgraded = False

    # Agent 2: Background task — fetch pages in parallel + LLM.
    async def _llm_task():
        nonlocal upgraded
        sources = await gather_page_contents(client, results, max_pages=5)
        if not sources:
            return None, []
        try:
            prompt = build_grounded_prompt(query, sources)
            parts = []
            async for chunk in get_provider().stream(prompt):
                parts.append(chunk)
            final = "".join(parts)
            upgraded = True
            return final, sources
        except Exception:
            logger.exception("LLM background error")
            return None, sources

    llm_task = asyncio.create_task(_llm_task())

    # Stream optimistic fallback answer immediately.
    for i in range(0, len(fallback), 40):
        yield fallback[i : i + 40]
        await asyncio.sleep(0)

    # Wait for LLM upgrade. If it completes, stream the LLM answer.
    llm_answer, sources = await llm_task
    sources_for_cache = sources

    if upgraded and llm_answer:
        # Signal frontend to reset before streaming LLM upgrade.
        yield {"__reset__": True}
        for i in range(0, len(llm_answer), 40):
            yield llm_answer[i : i + 40]
            await asyncio.sleep(0)
        final_answer = llm_answer
    else:
        final_answer = fallback

    # Cache for instant repeat.
    _cache_set(cache_key, final_answer, sources_for_cache)

    # Attach sources.
    yield {"__sources__": sources_for_cache}

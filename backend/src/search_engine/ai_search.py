"""AI Mode search — fast, grounded answers from search snippets.

Multi-agent architecture (real-world RAG pattern):
- Agent 1: Search snippets -> instant LLM context (no page fetch blocking)
- Agent 2: NVIDIA Nemotron LLM streams grounded answer
- Agent 3: Cache -> repeat queries are instant (~0.02s)

Speed tricks:
- Search snippets used directly as LLM context (skip page fetch = saves 2-3s)
- Stream LLM answer immediately (no fallback replacement that flickers)
- Aggressive caching (15 min TTL, 200 entries)
- Short LLM tokens (400) for fast generation
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
# HTML -> text (for page fetch fallback)
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
# Page fetching (background only, for richer context if needed)
# ---------------------------------------------------------------------------
async def fetch_page_text(client, url: str, max_chars: int = 500) -> str:
    try:
        response = await client.get(url, timeout=1.5)
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


async def gather_page_contents(client, results: list[dict], max_pages: int = 3):
    """Fetch content for top pages in parallel (background enrichment)."""
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

    tasks = [_fetch_one(item) for item in results[:max_pages * 2]]
    fetched = await asyncio.gather(*tasks)

    for src in fetched:
        if src is not None and len(sources) < max_pages:
            sources.append(src)

    return sources


# ---------------------------------------------------------------------------
# Prompt building (compact, snippet-grounded)
# ---------------------------------------------------------------------------
def build_grounded_prompt(query: str, sources: list[dict]) -> str:
    lines = [f"Question: {query}\n", "Sources (use THESE to answer, cite [n]):\n"]
    for idx, src in enumerate(sources, start=1):
        lines.append(
            f"[{idx}] {src['title']} | {src['url']}\n"
            f"    {src['content']}\n"
        )
    lines.append(
        "\nAnswer briefly and accurately using ONLY the sources above. "
        "Cite sources inline with [n]. End with a short Sources list. "
        "Do not invent facts."
    )
    return "\n".join(lines)


def build_snippet_sources(results: list[dict]) -> list[dict]:
    """Convert search results into source dicts using snippets (instant, no fetch)."""
    sources = []
    for idx, item in enumerate(results[:5], start=1):
        snippet = item.get("snippet", "").strip()[:300]
        sources.append({
            "title": item.get("title", "") or item.get("url", ""),
            "url": item.get("url", ""),
            "domain": item.get("domain", "") or "",
            "content": snippet,
        })
    return sources


# ---------------------------------------------------------------------------
# Main stream — optimistic LLM streaming
# ---------------------------------------------------------------------------
async def stream_ai_answer(query: str, client):
    """Stream a grounded answer from NVIDIA Nemotron.

    Strategy:
    1. Cache hit -> instant stream (0.02s)
    2. Cache miss -> search snippets -> build prompt -> stream LLM immediately
    3. No fallback replacement (no __reset__ flicker)
    4. If LLM fails, fall back to snippet summary
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
    # 1. Search results (get snippets immediately).
    results = await search_metasearch(query, page=1)
    if not results:
        yield "I couldn't find any search results for your query."
        return

    # 2. Build sources from snippets (instant, no page fetch blocking LLM).
    sources = build_snippet_sources(results)

    # 3. Try LLM provider (stream directly, no fallback replacement).
    provider = get_provider()
    llm_ok = provider is not None

    if llm_ok:
        # Retry LLM up to 3 times — transient API failures shouldn't break AI Mode.
        for attempt in range(3):
            try:
                prompt = build_grounded_prompt(query, sources)
                answer_parts = []
                truncated = False
                async for chunk in provider.stream(prompt):
                    if isinstance(chunk, dict):
                        truncated = bool(chunk.get("__truncated__"))
                        continue
                    answer_parts.append(chunk)
                    yield chunk
                final_answer = "".join(answer_parts).strip()
                # If LLM returned any content, use it. Only fall back if truly empty.
                if final_answer:
                    if truncated:
                        # Never cache a cut-off answer — Regenerate must retry.
                        yield "\n\n(Answer may be incomplete — try Regenerate.)"
                    else:
                        _cache_set(cache_key, final_answer, sources)
                    yield {"__sources__": sources}
                    return
                logger.warning(f"LLM returned empty answer (attempt {attempt + 1}/3)")
            except Exception:
                logger.exception(f"NVIDIA stream error (attempt {attempt + 1}/3)")
                await asyncio.sleep(1)

    # 4. Fallback: snippet-based summary (no LLM).
    fallback = build_fallback_answer(query, sources)
    for i in range(0, len(fallback), 40):
        yield fallback[i : i + 40]
        await asyncio.sleep(0)
    _cache_set(cache_key, fallback, sources)
    yield {"__sources__": sources}


def build_fallback_answer(query: str, sources: list[dict]) -> str:
    if not sources:
        return "I couldn't find any search results for your query."
    lines = [f"Based on results for “{query}”:\n"]
    for idx, src in enumerate(sources, start=1):
        content = src.get("content", "").strip()[:250]
        if len(src.get("content", "")) > 250:
            content += "…"
        lines.append(f"[{idx}] {src['title']} ({src['domain']}): {content}")
    lines.append(
        f"\nNote: LLM ({provider_name()}) unavailable — showing raw excerpts. "
        "Configure NVIDIA_API_KEY for AI-generated answers."
    )
    return "\n".join(lines)

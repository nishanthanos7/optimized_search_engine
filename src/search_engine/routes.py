import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse

from .cache import get_cached, set_cached
from .providers import (
    canonical_url,
    get_suggestions,
    rank_results,
    search_metasearch,
    search_wikipedia,
)

router = APIRouter()
HTML_FILE = Path(__file__).resolve().parent / "index.html"


@router.get("/")
async def home():
    if HTML_FILE.exists():
        return FileResponse(HTML_FILE)
    raise HTTPException(status_code=404, detail="index.html not found")


@router.get("/suggest")
async def suggest(request: Request, q: str = Query(..., min_length=1)):
    suggestions = await get_suggestions(q, request.app.state.http_client)
    return {"suggestions": suggestions}


@router.get("/search")
async def search(
    request: Request,
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
):
    cache_key = f"ddgs-v6:{q.lower().strip()}:{page}"
    cached = get_cached(cache_key)
    if cached is not None:
        return {"query": q, "page": page, "results": cached}

    client = request.app.state.http_client
    async with request.app.state.search_semaphore:
        metasearch_results = await search_metasearch(q, page)
        wiki_results = (
            await search_wikipedia(q, client)
            if page == 1 and not metasearch_results
            else []
        )

    merged: dict[str, dict] = {}

    def insert(item: dict):
        key = canonical_url(item.get("url", ""))
        if not key:
            return
        if key in merged:
            for engine in item["engines"]:
                if engine not in merged[key]["engines"]:
                    merged[key]["engines"].append(engine)
            for field in ("title", "snippet"):
                if len(item.get(field, "")) > len(merged[key].get(field, "")):
                    merged[key][field] = item[field]
        else:
            merged[key] = item

    for item in metasearch_results:
        insert(item)
    for item in wiki_results:
        insert(item)

    final_results = rank_results(q, list(merged.values()))
    if final_results:
        set_cached(cache_key, final_results)
    return {"query": q, "page": page, "results": final_results}
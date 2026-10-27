import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from .ai_search import stream_ai_answer
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
logger = logging.getLogger("search_engine.routes")


class AiAnswerRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's search question",
    )


@router.get("/")
async def home():
    if HTML_FILE.exists():
        return FileResponse(HTML_FILE)
    raise HTTPException(status_code=404, detail="index.html not found")


@router.get("/suggest")
async def suggest(request: Request, q: str = Query(..., min_length=1)):
    suggestions = await get_suggestions(q, request.app.state.http_client)
    return {"suggestions": suggestions}


@router.get("/health")
async def health():
    from .llm import is_available, provider_name

    return {
        "status": "ok",
        "llm_provider": provider_name(),
        "llm_available": is_available(),
    }


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
        # Run metasearch + Wikipedia in parallel (multi-agent style)
        metasearch_task = asyncio.create_task(search_metasearch(q, page))
        wiki_task = asyncio.create_task(search_wikipedia(q, client))
        metasearch_results = await metasearch_task
        wiki_results = await wiki_task if page == 1 else []

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


@router.post("/api/ai-answer")
async def ai_answer(request: Request, payload: AiAnswerRequest):
    """AI Mode: fetch search pages and stream a grounded Gemini answer."""
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    client = request.app.state.http_client

    async def generate():
        sources_for_frontend = []
        try:
            async for chunk in stream_ai_answer(query, client):
                if isinstance(chunk, dict):
                    if "__sources__" in chunk:
                        sources_for_frontend = chunk["__sources__"]
                        continue
                    if "__reset__" in chunk:
                        yield json.dumps({"type": "reset"}) + "\n"
                        continue
                if chunk:
                    # Send each text chunk as a JSON line so the frontend can
                    # distinguish text from the final source list.
                    yield json.dumps({"type": "text", "content": chunk}) + "\n"

            if sources_for_frontend:
                yield json.dumps(
                    {"type": "sources", "sources": sources_for_frontend}
                ) + "\n"
        except Exception:
            logger.exception("AI answer stream failed")
            yield json.dumps(
                {"type": "text", "content": "\n\nSorry, something went wrong while generating the answer."}
            ) + "\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )
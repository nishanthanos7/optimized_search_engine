"""FastAPI routes for the Index Nepal citizen-services assistant."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from . import SERVICE_BY_SLUG
from .answer import stream_answer
from .db import connect, DEFAULT_DB_PATH
from ..llm import get_provider
from .schemas import CitizenAnswerRequest, CitizenFeedbackRequest

router = APIRouter()
logger = logging.getLogger("search_engine.citizen.routes")


def _db_path(request: Request) -> str:
    return str(
        getattr(request.app.state, "citizen_db_path", DEFAULT_DB_PATH)
    )


@router.get("/services")
async def list_services(request: Request):
    """List the five citizen services with source counts."""
    services = []
    with connect(_db_path(request)) as conn:
        for slug, svc in SERVICE_BY_SLUG.items():
            row = conn.execute(
                "select count(*), coalesce(max(last_checked), '') from documents "
                "where service = ? and status = 'active'",
                (slug,),
            ).fetchone()
            services.append(
                {
                    "slug": slug,
                    "name_en": svc.name_en,
                    "name_ne": svc.name_ne,
                    "description_en": svc.description_en,
                    "questions": list(svc.questions_en),
                    "source_count": row[0],
                    "last_checked": row[1] or None,
                }
            )
    return {"services": services}


@router.post("/answer")
async def citizen_answer(request: Request, payload: CitizenAnswerRequest):
    """Stream a grounded, cited answer for a citizen-service question."""
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    service = payload.service
    if service is not None and service not in SERVICE_BY_SLUG:
        raise HTTPException(status_code=400, detail=f"Unknown service: {service}")

    language = payload.language

    async def generate():
        try:
            provider = get_provider()
            with connect(_db_path(request)) as conn:
                async for event in stream_answer(
                    conn, query, service, language, provider
                ):
                    yield json.dumps(event) + "\n"
        except Exception:
            logger.exception("Citizen answer stream failed")
            yield json.dumps(
                {
                    "type": "text",
                    "content": "Sorry, something went wrong while generating the answer.",
                }
            ) + "\n"
            yield json.dumps(
                {
                    "type": "meta",
                    "meta": {
                        "verification": "failed",
                        "services": [service] if service else [],
                        "language": language,
                        "conflicts": [],
                        "stale": False,
                        "needs_review": False,
                    },
                }
            ) + "\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/feedback")
async def citizen_feedback(request: Request, payload: CitizenFeedbackRequest):
    """Store a helpful/not-helpful feedback vote."""
    with connect(_db_path(request)) as conn:
        conn.execute(
            "insert into feedback (query, service, helpful, note, created_at) "
            "values (?, ?, ?, ?, ?)",
            (
                payload.query,
                payload.service,
                int(payload.helpful),
                payload.note,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    return {"ok": True}


@router.get("/health")
async def citizen_health(request: Request):
    """Report database health and corpus counts."""
    with connect(_db_path(request)) as conn:
        doc_count = conn.execute(
            "select count(*) from documents where status = 'active'"
        ).fetchone()[0]
        chunk_count = conn.execute("select count(*) from chunks").fetchone()[0]
        last = conn.execute(
            "select coalesce(max(last_checked), '') from documents"
        ).fetchone()[0]
    return {
        "status": "ok",
        "document_count": doc_count,
        "chunk_count": chunk_count,
        "last_ingest_at": last or None,
    }

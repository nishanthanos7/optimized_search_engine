"""FTS5 BM25 retrieval with source metadata, staleness, and conflict flags."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, timedelta

from .db import connect, DEFAULT_DB_PATH
from .query import build_fts_query, expand_query

MIN_BM25 = -0.1
MAX_CHUNKS_PER_DOC = 3
STALE_DAYS = 30

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

_BASE_SQL = (
    "select c.id, c.document_id, c.text, c.page, c.heading, "
    "d.title, d.url, d.office, d.service, d.lang, d.doc_type, "
    "d.published_at, d.last_checked, d.last_reviewed, d.needs_review, "
    "d.status, bm25(chunks_fts) as score "
    "from chunks_fts join chunks c on chunks_fts.rowid = c.id "
    "join documents d on c.document_id = d.id "
    "where chunks_fts match ? and d.status = 'active'"
)


@dataclass
class RetrievedChunk:
    chunk_id: int
    document_id: int
    text: str
    page: int | None
    heading: str | None
    title: str
    url: str
    office: str | None
    service: str
    lang: str | None
    doc_type: str | None
    published_at: str | None
    last_checked: str | None
    last_reviewed: str | None
    needs_review: bool
    status: str
    score: float


@dataclass
class Source:
    id: int
    title: str
    url: str
    office: str | None
    service: str
    last_checked: str | None
    last_reviewed: str | None
    needs_review: bool
    stale: bool
    doc_type: str | None


@dataclass
class RetrievalResult:
    chunks: list[RetrievedChunk] = field(default_factory=list)
    sources: list[Source] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    stale: bool = False
    needs_review: bool = False


def _normalize_digits(value: str) -> str:
    return value.translate(_DEVANAGARI_DIGITS)


def _extract_value_units(text: str) -> list[tuple[str, str]]:
    """Find (unit, value) pairs for currency, years, days, months, hours, percent."""
    pairs: list[tuple[str, str]] = []
    text = _normalize_digits(text)
    patterns = [
        (r"NPR\s*([\d,]+(?:\.\d+)?)", "fee"),
        (r"रु\s*([\d,]+(?:\.\d+)?)", "fee"),
        (r"Rs\.?\s*([\d,]+(?:\.\d+)?)", "fee"),
        (r"([\d,]+(?:\.\d+)?)\s*years?", "age"),
        (r"([\d,]+(?:\.\d+)?)\s*वर्ष", "age"),
        (r"([\d,]+(?:\.\d+)?)\s*days?", "days"),
        (r"([\d,]+(?:\.\d+)?)\s*दिन", "days"),
        (r"([\d,]+(?:\.\d+)?)\s*months?", "months"),
        (r"([\d,]+(?:\.\d+)?)\s*महिना", "months"),
        (r"([\d,]+(?:\.\d+)?)\s*hours?", "hours"),
        (r"([\d,]+(?:\.\d+)?)\s*घण्टा", "hours"),
        (r"([\d,]+(?:\.\d+)?)\s*%", "percent"),
        (r"\b([\d,]{4})\b", "year"),
    ]
    for pattern, unit in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            raw = match.group(1)
            norm = raw.replace(",", "").replace(" ", "")
            pairs.append((unit, norm))
    return pairs


def _is_stale(last_checked: str | None) -> bool:
    if not last_checked:
        return False
    try:
        checked = date.fromisoformat(last_checked[:10])
    except ValueError:
        return False
    return (date.today() - checked) > timedelta(days=STALE_DAYS)


def _search_once(conn, fts_query: str, service: str | None, limit: int):
    # service may hold comma-separated slugs; match with INSTR.
    if service is not None:
        sql = _BASE_SQL + " and instr(d.service, ?) > 0 order by score limit ?"
        params = [fts_query, service, limit]
    else:
        sql = _BASE_SQL + " order by score limit ?"
        params = [fts_query, limit]
    return conn.execute(sql, params).fetchall()


def retrieve(
    conn,
    query: str,
    services: list[str] | None = None,
    limit: int = 10,
) -> RetrievalResult:
    terms = expand_query(query)
    fts_query = build_fts_query(terms)
    if not fts_query:
        return RetrievalResult()

    service_filter = list(services) if services else []

    rows: list = []
    if service_filter:
        for service in service_filter:
            rows.extend(_search_once(conn, fts_query, service, limit))
    else:
        rows.extend(_search_once(conn, fts_query, None, limit * 4))

    # Group by document, keep at most MAX_CHUNKS_PER_DOC per document.
    by_doc: dict[int, list] = {}
    for row in rows:
        doc_id = row["document_id"]
        by_doc.setdefault(doc_id, []).append(dict(row))

    selected: list[dict] = []
    for doc_id, doc_rows in by_doc.items():
        selected.extend(doc_rows[:MAX_CHUNKS_PER_DOC])

    # For cross-service queries, ensure at least 2 chunks per matched service.
    if len(service_filter) > 1:
        for service in service_filter:
            service_selected = [r for r in selected if r["service"] == service]
            if len(service_selected) < 2:
                for r in _search_once(conn, fts_query, service, limit):
                    if r["document_id"] not in {
                        s["document_id"] for s in service_selected
                    } and len(service_selected) < 2:
                        selected.append(r)
                        service_selected.append(r)

    chunks: list[RetrievedChunk] = []
    seen_urls: dict[str, int] = {}
    sources: list[Source] = []
    source_id = 1
    result_stale = False
    result_needs_review = False

    for row in selected:
        chunk = RetrievedChunk(
            chunk_id=row["id"],
            document_id=row["document_id"],
            text=row["text"],
            page=row["page"],
            heading=row["heading"],
            title=row["title"],
            url=row["url"],
            office=row["office"],
            service=row["service"],
            lang=row["lang"],
            doc_type=row["doc_type"],
            published_at=row["published_at"],
            last_checked=row["last_checked"],
            last_reviewed=row["last_reviewed"],
            needs_review=bool(row["needs_review"]),
            status=row["status"],
            score=row["score"],
        )
        chunks.append(chunk)

        url = row["url"]
        if url not in seen_urls:
            stale = _is_stale(row["last_checked"])
            if stale:
                result_stale = True
            if bool(row["needs_review"]):
                result_needs_review = True
            seen_urls[url] = source_id
            sources.append(
                Source(
                    id=source_id,
                    title=row["title"],
                    url=url,
                    office=row["office"],
                    service=row["service"],
                    last_checked=row["last_checked"],
                    last_reviewed=row["last_reviewed"],
                    needs_review=bool(row["needs_review"]),
                    stale=stale,
                    doc_type=row["doc_type"],
                ),
            )
            source_id += 1

    # Conflict detection: within each service, find units with multiple values.
    conflicts: list[str] = []
    by_service: dict[str, list[str]] = {}
    for chunk in chunks:
        by_service.setdefault(chunk.service, []).append(chunk.text)
    for service, texts in by_service.items():
        unit_values: dict[str, set[str]] = {}
        for text in texts:
            for unit, value in _extract_value_units(text):
                unit_values.setdefault(unit, set()).add(value)
        for unit, values in sorted(unit_values.items()):
            if len(values) > 1:
                conflicts.append(f"{service} {unit}")

    return RetrievalResult(
        chunks=chunks,
        sources=sources,
        conflicts=conflicts,
        stale=result_stale,
        needs_review=result_needs_review,
    )

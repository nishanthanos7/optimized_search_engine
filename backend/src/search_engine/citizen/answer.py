"""Grounded answer generation with citation/number guard and streaming."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from .cache import get_cached_answer, set_cached_answer
from .db import corpus_version
from .query import normalize_query
from .retrieval import RetrievedChunk, Source, retrieve
from .verification import (
    REFUSAL_EN,
    REFUSAL_NE,
    SAFE_SENTENCE_EN,
    SAFE_SENTENCE_NE,
    verify_answer,
    verify_sentence,
)

logger = logging.getLogger("search_engine.citizen.answer")

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[।.!?])\s+")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_prompt(
    question: str, chunks: list[RetrievedChunk], language: str
) -> str:
    lang_instruction = (
        "Answer in Nepali." if language == "ne" else "Answer in English."
    )
    lines = [
        "You are Index, a Nepal citizen-services assistant.",
        "Use ONLY the official excerpts below to answer the question.",
        "Cite every factual sentence with [n] where n is the source number.",
        "",
        "Rules:",
        "- If sources disagree on a fact (fee, age, deadline, office, document),",
        "  show both values with their citations and say:",
        '  "Sources differ — confirm with the office."',
        "- For tiered fees, show all applicable tiers. Never pick one.",
        "- If a local ward-office detail is not in the excerpts, say it is not",
        "  in the indexed national sources.",
        "- Never fill gaps from general knowledge.",
        f"- {lang_instruction}",
        "",
    ]

    for idx, chunk in enumerate(chunks, start=1):
        checked = chunk.last_checked or "unknown"
        lines.append(
            f"[{idx}] {chunk.title} | {chunk.office or 'official source'} | "
            f"{chunk.url} | source checked {checked}\n"
            f"    {chunk.text}"
        )

    lines.append("")
    lines.append(f"Question: {question}")
    lines.append("")
    lines.append("Answer:")
    return "\n".join(lines)


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]


def _safe(language: str) -> str:
    return SAFE_SENTENCE_NE if language == "ne" else SAFE_SENTENCE_EN


def _refusal(language: str) -> str:
    return REFUSAL_NE if language == "ne" else REFUSAL_EN


async def stream_answer(
    conn,
    question: str,
    service: str | None,
    language: str,
    provider=None,
):
    """Stream a grounded, citation-guarded answer as dict events.

    Yields:
        {"type": "sources", "sources": [Source dicts]}
        {"type": "text", "content": str}
        {"type": "meta", "meta": {...}}
    """
    version = corpus_version(conn)
    cache_key = (
        f"{language}:{service or 'all'}:"
        f"{normalize_query(question)}:{version}"
    )

    cached = get_cached_answer(cache_key)
    if cached is not None:
        answer, sources, meta = cached
        yield {"type": "sources", "sources": [s.__dict__ for s in sources]}
        for i in range(0, len(answer), 40):
            yield {"type": "text", "content": answer[i : i + 40]}
        yield {"type": "meta", "meta": meta}
        return

    services = [service] if service else None
    result = retrieve(conn, question, services=services)

    # Map source id -> source text for verification.
    source_texts: dict[int, str] = {}
    for chunk in result.chunks:
        for src in result.sources:
            if src.url == chunk.url:
                source_texts.setdefault(src.id, "")
                source_texts[src.id] += " " + chunk.text
                break

    sources_payload = [s.__dict__ for s in result.sources]
    yield {"type": "sources", "sources": sources_payload}

    if not result.chunks:
        text = _refusal(language)
        meta = {
            "services": services or [],
            "language": language,
            "verification": "refused",
            "conflicts": [],
            "stale": result.stale,
            "needs_review": result.needs_review,
            "last_checked": (
                result.sources[0].last_checked if result.sources else None
            ),
            "last_reviewed": None,
        }
        for i in range(0, len(text), 40):
            yield {"type": "text", "content": text[i : i + 40]}
        yield {"type": "meta", "meta": meta}
        return

    if provider is None:
        text = (
            "I found official sources but can't generate a summary right now."
            if language == "en"
            else "मसँग आधिकारिक स्रोत भेटिए तर अहिलै सारांश दिन सक्दिन।"
        )
        meta = {
            "services": services or [],
            "language": language,
            "verification": "failed",
            "conflicts": result.conflicts,
            "stale": result.stale,
            "needs_review": result.needs_review,
            "last_checked": (
                result.sources[0].last_checked if result.sources else None
            ),
            "last_reviewed": None,
        }
        for i in range(0, len(text), 40):
            yield {"type": "text", "content": text[i : i + 40]}
        yield {"type": "meta", "meta": meta}
        return

    # Stream through the LLM, verifying each complete sentence before yielding.
    prompt = build_prompt(question, result.chunks, language)
    buffer = ""
    yielded_text: list[str] = []
    partial = False
    provider_error = False
    truncated = False

    try:
        async for chunk in provider.stream(prompt):
            if isinstance(chunk, dict):
                if chunk.get("__truncated__"):
                    truncated = True
                continue
            buffer += chunk

            sentences = _split_sentences(buffer)
            if len(sentences) > 1:
                complete = sentences[:-1]
                buffer = sentences[-1]
            else:
                complete = []
                buffer = buffer

            for sentence in complete:
                verified, ok = verify_sentence(
                    sentence, result.sources, source_texts, language
                )
                if not ok:
                    partial = True
                    out = _safe(language)
                else:
                    out = sentence
                yielded_text.append(out)
                for i in range(0, len(out), 40):
                    yield {"type": "text", "content": out[i : i + 40]}
                yield {"type": "text", "content": " "}

    except Exception:
        logger.exception("Citizen answer stream failed")
        provider_error = True

    # Verify and yield any remaining buffered text.
    if buffer.strip():
        verified, ok = verify_sentence(
            buffer, result.sources, source_texts, language
        )
        if not ok:
            partial = True
            out = _safe(language)
        else:
            out = buffer
        yielded_text.append(out)
        for i in range(0, len(out), 40):
            yield {"type": "text", "content": out[i : i + 40]}

    full_text = "".join(yielded_text).strip()

    # Full-answer verification.
    if not verify_answer(full_text, result.sources, source_texts):
        partial = True
        full_text = _refusal(language)

    if truncated:
        partial = True

    if provider_error:
        verification = "failed"
    elif partial:
        verification = "partial"
    else:
        verification = "verified"

    meta = {
        "services": services or [],
        "language": language,
        "verification": verification,
        "conflicts": result.conflicts,
        "stale": result.stale,
        "needs_review": result.needs_review,
        "last_checked": (
            result.sources[0].last_checked if result.sources else None
        ),
        "last_reviewed": (
            result.sources[0].last_reviewed if result.sources else None
        ),
    }

    # Cache only fully verified answers.
    if verification == "verified" and full_text:
        set_cached_answer(cache_key, full_text, result.sources, meta)

    yield {"type": "meta", "meta": meta}

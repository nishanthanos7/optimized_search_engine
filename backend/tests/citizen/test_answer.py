import pytest

from search_engine.citizen.answer import build_prompt, stream_answer
from search_engine.citizen.db import connect, init_db


class FakeProvider:
    def __init__(self, tokens):
        self.tokens = tokens
        self.calls = 0

    async def stream(self, prompt):
        self.calls += 1
        for token in self.tokens:
            yield token


def seed_passport(conn):
    conn.execute(
        "insert into documents (url, title, office, service, doc_type, lang, "
        "fetched_at, last_checked, content_hash, status) "
        "values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
        (
            "https://example.gov.np/passport-fee",
            "Passport Fee",
            "Department of Passports",
            "passport",
            "fee",
            "en",
            "2026-10-29",
            "2026-10-29",
            "hash1",
        ),
    )
    doc_id = conn.execute("select last_insert_rowid()").fetchone()[0]
    conn.execute(
        "insert into chunks (document_id, text) values (?, ?)",
        (
            doc_id,
            "The fee for a 34-page passport is NPR 12,000. "
            "The fee for a 66-page passport is NPR 20,000. "
            "Processing takes 10 to 30 days.",
        ),
    )


def test_prompt_requires_citations_conflicts_and_tiers():
    prompt = build_prompt("How much is the passport fee?", [], "en")
    assert "Use ONLY the official excerpts" in prompt
    assert "Sources differ" in prompt
    assert "all applicable tiers" in prompt
    assert "Answer in English" in prompt


@pytest.mark.asyncio
async def test_stream_replaces_unsupported_number_and_marks_partial(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        seed_passport(conn)
        conn.commit()

    provider = FakeProvider(
        ["The fee is NPR 99,000 [1]. Processing takes 10 to 30 days [1]."]
    )
    events = [
        event
        async for event in stream_answer(
            conn, "passport fee", "passport", "en", provider
        )
    ]
    text = "".join(
        event["content"] for event in events if event["type"] == "text"
    )
    assert "99,000" not in text
    assert "can't verify" in text
    meta = next(
        event["meta"] for event in events if event["type"] == "meta"
    )
    assert meta["verification"] == "partial"


@pytest.mark.asyncio
async def test_empty_retrieval_returns_refusal_without_llm(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        conn.commit()
        provider = FakeProvider(["should not be called"])
        events = [
            event
            async for event in stream_answer(
                conn, "unknown topic", None, "en", provider
            )
        ]
    text = "".join(
        event["content"] for event in events if event["type"] == "text"
    )
    assert provider.calls == 0
    assert "couldn't find this" in text.lower()
    meta = next(
        event["meta"] for event in events if event["type"] == "meta"
    )
    assert meta["verification"] == "refused"

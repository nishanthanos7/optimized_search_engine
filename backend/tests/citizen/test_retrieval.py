from search_engine.citizen.db import connect, init_db
from search_engine.citizen.retrieval import retrieve, MIN_BM25


def seed_corpus(conn):
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
    doc1 = conn.execute("select last_insert_rowid()").fetchone()[0]
    conn.execute(
        "insert into chunks (document_id, text) values (?, ?)",
        (doc1, "Passport fee for 34 pages is NPR 12,000. Processing takes 10 to 30 days."),
    )
    conn.execute(
        "insert into documents (url, title, office, service, doc_type, lang, "
        "fetched_at, last_checked, content_hash, status) "
        "values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
        (
            "https://example.gov.np/passport-fee-2",
            "Passport Fee 66 Pages",
            "Department of Passports",
            "passport",
            "fee",
            "en",
            "2026-10-29",
            "2026-10-29",
            "hash2",
        ),
    )
    doc2 = conn.execute("select last_insert_rowid()").fetchone()[0]
    conn.execute(
        "insert into chunks (document_id, text) values (?, ?)",
        (doc2, "Passport fee for 66 pages is NPR 20,000."),
    )
    conn.execute(
        "insert into documents (url, title, office, service, doc_type, lang, "
        "fetched_at, last_checked, content_hash, status) "
        "values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
        (
            "https://example.gov.np/licence-age",
            "Driving Licence Age",
            "Department of Transport Management",
            "driving-licence",
            "procedure",
            "en",
            "2026-10-29",
            "2026-10-29",
            "hash3",
        ),
    )
    doc3 = conn.execute("select last_insert_rowid()").fetchone()[0]
    conn.execute(
        "insert into chunks (document_id, text) values (?, ?)",
        (doc3, "Minimum age for a driving licence is 16 years."),
    )


def test_retrieve_finds_passport_chunks_and_sources(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        seed_corpus(conn)
        conn.commit()
        result = retrieve(conn, "passport fee")
    assert result.chunks
    urls = {s.url for s in result.sources}
    assert "https://example.gov.np/passport-fee" in urls
    assert result.sources[0].last_checked


def test_retrieve_caps_two_chunks_per_document(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        seed_corpus(conn)
        conn.commit()
        result = retrieve(conn, "passport", limit=10)
    # Only the first passport doc matched strongly; the second is lower ranked.
    # At most 2 chunks per document.
    by_doc: dict[int, int] = {}
    for chunk in result.chunks:
        by_doc[chunk.document_id] = by_doc.get(chunk.document_id, 0) + 1
    assert all(count <= 2 for count in by_doc.values())


def test_retrieve_filters_by_service(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        seed_corpus(conn)
        conn.commit()
        result = retrieve(conn, "age", services=["driving-licence"])
    assert result.chunks
    assert all(chunk.service == "driving-licence" for chunk in result.chunks)


def test_cross_service_query_returns_both_services(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        seed_corpus(conn)
        conn.commit()
        result = retrieve(conn, "passport and driving licence",
                          services=["passport", "driving-licence"])
    services = {chunk.service for chunk in result.chunks}
    assert "passport" in services
    assert "driving-licence" in services


def test_old_source_is_marked_stale(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        conn.execute(
            "insert into documents (url, title, service, doc_type, lang, "
            "fetched_at, last_checked, content_hash, status) "
            "values (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
            ("https://example.gov.np/old", "Old", "passport", "procedure", "en",
             "2020-01-01", "2020-01-01", "hash"),
        )
        doc_id = conn.execute("select last_insert_rowid()").fetchone()[0]
        conn.execute(
            "insert into chunks (document_id, text) values (?, ?)",
            (doc_id, "Old passport procedure text here."),
        )
        conn.commit()
        result = retrieve(conn, "passport procedure")
    stale = [s for s in result.sources if s.stale]
    assert stale, "expected at least one stale source"


def test_conflicting_fee_values_are_flagged(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        seed_corpus(conn)
        conn.commit()
        result = retrieve(conn, "passport fee")
    conflict_labels = " ".join(result.conflicts)
    assert "fee" in conflict_labels.lower() or "NPR" in conflict_labels


def test_empty_retrieval_returns_empty_result(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        result = retrieve(conn, "something not in corpus")
    assert result.chunks == []
    assert result.sources == []

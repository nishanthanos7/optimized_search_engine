import sqlite3

from search_engine.citizen.db import connect, corpus_version, init_db


def test_init_db_creates_required_tables(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        tables = {
            row[0]
            for row in conn.execute(
                "select name from sqlite_master where type in ('table', 'view')"
            )
        }
    assert {"documents", "chunks", "chunks_fts", "feedback"} <= tables


def test_fts_trigger_indexes_inserted_chunk(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        conn.execute(
            "insert into documents (url, title, service, fetched_at, last_checked, content_hash) "
            "values ('https://example.gov.np/a', 'A', 'passport', '2026-10-29', '2026-10-29', 'hash')"
        )
        document_id = conn.execute("select last_insert_rowid()").fetchone()[0]
        conn.execute(
            "insert into chunks (document_id, text) values (?, 'passport application fee')",
            (document_id,),
        )
        count = conn.execute(
            "select count(*) from chunks_fts where chunks_fts match 'passport'"
        ).fetchone()[0]
    assert count == 1


def test_corpus_version_changes_when_documents_change(tmp_path):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    with connect(db_path) as conn:
        before = corpus_version(conn)
        conn.execute(
            "insert into documents (url, title, service, fetched_at, last_checked, content_hash) "
            "values ('https://example.gov.np/a', 'A', 'passport', '2026-10-29', '2026-10-29', 'hash')"
        )
        after = corpus_version(conn)
    assert before != after

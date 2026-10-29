"""SQLite connection, schema, and corpus versioning for the citizen index."""

from __future__ import annotations

import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "citizen" / "index.db"
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  office TEXT,
  service TEXT NOT NULL,
  doc_type TEXT,
  lang TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  last_checked TEXT NOT NULL,
  last_reviewed TEXT,
  content_hash TEXT NOT NULL,
  etag TEXT,
  last_modified TEXT,
  http_status INTEGER,
  needs_review INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);

-- service may hold comma-separated slugs when one URL serves multiple services.

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER,
  heading TEXT,
  text TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text,
  content='chunks',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 0'
);

CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', old.id, old.text);
  INSERT INTO chunks_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY,
  query TEXT NOT NULL,
  service TEXT,
  helpful INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_service ON documents(service);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
"""


def connect(path: str | Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_db(path: str | Path = DEFAULT_DB_PATH) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as conn:
        conn.executescript(SCHEMA)


def corpus_version(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "select count(*), coalesce(max(last_checked), '') from documents"
    ).fetchone()
    return f"{row[0]}:{row[1]}"

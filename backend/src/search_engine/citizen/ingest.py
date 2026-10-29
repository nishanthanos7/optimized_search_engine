"""Curated seed ingestion for the citizen index: fetch, extract, upsert."""

from __future__ import annotations

import argparse
import hashlib
import logging
import time
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path

import httpx
import yaml

from . import SERVICES, SERVICE_BY_SLUG
from .db import connect, DEFAULT_DB_PATH, init_db
from .extract import extract_html, extract_pdf, normalize_text

logger = logging.getLogger("search_engine.citizen.ingest")

USER_AGENT = "IndexNepalBot/0.1 (+https://index.example/contact)"
REQUEST_TIMEOUT = 15.0
MAX_BODY_BYTES = 20 * 1024 * 1024
MIN_TEXT_CHARS = 200

# One request per second per host.
_last_request_by_host: dict[str, float] = {}


class IngestReport:
    def __init__(self) -> None:
        self.added = 0
        self.updated = 0
        self.unchanged = 0
        self.skipped = 0
        self.errors: list[str] = []

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            f"IngestReport(added={self.added}, updated={self.updated}, "
            f"unchanged={self.unchanged}, skipped={self.skipped}, "
            f"errors={len(self.errors)})"
        )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _rate_limit(host: str) -> None:
    now = time.monotonic()
    last = _last_request_by_host.get(host, 0.0)
    elapsed = now - last
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)
    _last_request_by_host[host] = time.monotonic()


def _robots_allowed(client: httpx.Client, url: str) -> bool:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(robots_url)
        try:
            resp = client.get(robots_url, timeout=10.0)
            if resp.status_code >= 400:
                return True
            parser.parse(resp.text.splitlines())
        except Exception:
            return True
        return parser.can_fetch(USER_AGENT, url)
    except Exception:
        return True


def _extract_text(content_type: str, body: bytes) -> str:
    if "application/pdf" in content_type:
        pages = extract_pdf(body)
        return normalize_text("\n".join(pages))
    return normalize_text(extract_html(body.decode("utf-8", errors="replace")))


def ingest_seeds(
    db_path: str | Path = DEFAULT_DB_PATH,
    seeds_path: str | Path | None = None,
    client: httpx.Client | None = None,
) -> IngestReport:
    db_path = Path(db_path)
    if seeds_path is None:
        seeds_path = db_path.parent / "seeds.yaml"
    seeds_path = Path(seeds_path)

    init_db(db_path)

    try:
        seeds = yaml.safe_load(seeds_path.read_text(encoding="utf-8")) or []
    except FileNotFoundError:
        logger.error("Seeds file not found: %s", seeds_path)
        raise
    if not isinstance(seeds, list):
        raise ValueError("Seeds file must contain a list of seed entries")

    report = IngestReport()
    own_client = client is None
    if own_client:
        client = httpx.Client(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )

    try:
        with connect(db_path) as conn:
            for seed in seeds:
                try:
                    _ingest_one(conn, seed, client, report)
                except Exception as exc:  # noqa: BLE001 - one bad seed stops nothing
                    logger.exception("Failed to ingest seed %s", seed)
                    report.errors.append(str(exc))
                    report.skipped += 1
            conn.commit()
    finally:
        if own_client:
            client.close()

    return report


def _ingest_one(
    conn, seed: dict, client: httpx.Client, report: IngestReport
) -> None:
    service = seed.get("service")
    url = seed.get("url")
    if not service or service not in SERVICE_BY_SLUG:
        raise ValueError(f"Unknown or missing service in seed: {seed}")
    if not url:
        raise ValueError(f"Missing url in seed for service {service}")

    from urllib.parse import urlparse

    host = urlparse(url).netloc.lower()

    if not _robots_allowed(client, url):
        logger.info("robots.txt disallows %s", url)
        _mark_gone(conn, url)
        report.skipped += 1
        return

    _rate_limit(host)

    try:
        resp = client.get(url)
    except httpx.RequestError as exc:
        logger.error("Fetch failed for %s: %s", url, exc)
        report.errors.append(f"{url}: fetch failed ({exc})")
        report.skipped += 1
        return

    if resp.status_code in (404, 410):
        logger.info("Gone %s (%s)", url, resp.status_code)
        _mark_gone(conn, url)
        report.skipped += 1
        return
    if resp.status_code >= 400:
        logger.error("HTTP %s for %s", resp.status_code, url)
        report.errors.append(f"{url}: HTTP {resp.status_code}")
        report.skipped += 1
        return

    content_type = resp.headers.get("content-type", "")
    body = resp.content
    if len(body) > MAX_BODY_BYTES:
        logger.error("Body too large (%d bytes) for %s", len(body), url)
        report.errors.append(f"{url}: body too large ({len(body)} bytes)")
        report.skipped += 1
        return

    text = _extract_text(content_type, body)
    if len(text) < MIN_TEXT_CHARS:
        logger.info("needs_ocr %s (%d chars)", url, len(text))
        report.skipped += 1
        return

    content_hash = _content_hash(text)
    etag = resp.headers.get("etag")
    last_modified = resp.headers.get("last-modified")
    fetched_at = _now_iso()
    last_checked = fetched_at

    existing = conn.execute(
        "select id, service, content_hash, needs_review, last_reviewed from documents "
        "where url = ?",
        (url,),
    ).fetchone()

    title = seed.get("title")
    office = seed.get("office")
    doc_type = seed.get("doc_type")
    lang = seed.get("lang")
    published_at = seed.get("published_at")

    if existing is None:
        document_id = conn.execute(
            "insert into documents (url, title, office, service, doc_type, lang, "
            "published_at, fetched_at, last_checked, last_reviewed, content_hash, "
            "etag, last_modified, http_status, needs_review, status) "
            "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active')",
            (
                url, title, office, service, doc_type, lang, published_at,
                fetched_at, last_checked, None, content_hash, etag,
                last_modified, resp.status_code,
            ),
        ).lastrowid
        _replace_chunks(conn, document_id, text, seed.get("page"))
        report.added += 1
        return

    document_id = existing["id"]
    old_hash = existing["content_hash"]
    existing_services = existing["service"].split(",") if existing["service"] else []

    # Merge services: one URL can serve multiple services (e.g. donidcr FAQ for
    # both birth and marriage registration).
    merged_services = list(existing_services)
    if service not in merged_services:
        merged_services.append(service)
    merged_service_str = ",".join(merged_services)

    if content_hash == old_hash:
        conn.execute(
            "update documents set fetched_at = ?, last_checked = ?, http_status = ?, "
            "etag = ?, last_modified = ?, service = ? where id = ?",
            (fetched_at, last_checked, resp.status_code, etag, last_modified,
             merged_service_str, document_id),
        )
        report.unchanged += 1
        return

    # Content changed: replace chunks and flag for human review.
    _replace_chunks(conn, document_id, text, seed.get("page"))
    conn.execute(
        "update documents set fetched_at = ?, last_checked = ?, last_reviewed = ?, "
        "content_hash = ?, etag = ?, last_modified = ?, http_status = ?, "
        "needs_review = 1 where id = ?",
        (
            fetched_at, last_checked, existing["last_reviewed"], content_hash,
            etag, last_modified, resp.status_code, document_id,
        ),
    )
    report.updated += 1


def _mark_gone(conn, url: str) -> None:
    conn.execute(
        "update documents set status = 'gone' where url = ?",
        (url,),
    )


def _replace_chunks(conn, document_id: int, text: str, page_seed=None) -> None:
    conn.execute("delete from chunks where document_id = ?", (document_id,))
    # Remove stale FTS entries for this document's chunks (handled by chunks_ad
    # trigger since we delete rows first).
    chunks = _chunk_with_pages(text, page_seed)
    for chunk_text_value, page in chunks:
        conn.execute(
            "insert into chunks (document_id, page, text) values (?, ?, ?)",
            (document_id, page, chunk_text_value),
        )


def _chunk_with_pages(text: str, page_seed=None):
    from .extract import chunk_text

    chunks = chunk_text(text)
    page = None
    if page_seed is not None:
        try:
            page = int(page_seed)
        except (TypeError, ValueError):
            page = None
    return [(chunk, page) for chunk in chunks]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Ingest curated citizen-service seeds into SQLite FTS5."
    )
    parser.add_argument(
        "--seeds",
        default=str(DEFAULT_DB_PATH.parent / "seeds.yaml"),
        help="Path to seeds.yaml",
    )
    parser.add_argument(
        "--db",
        default=str(DEFAULT_DB_PATH),
        help="Path to SQLite database file",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    report = ingest_seeds(args.db, args.seeds)
    logger.info("Ingestion complete: %s", report)
    if report.errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from pathlib import Path

from search_engine.citizen.db import connect, init_db
from search_engine.citizen.ingest import ingest_seeds


class FakeResponse:
    status_code = 200
    headers = {"content-type": "text/html"}

    def __init__(self, text: str):
        self.text = text
        self.content = text.encode("utf-8")


class FakeClient:
    def __init__(self, bodies: dict[str, str]):
        self.bodies = bodies
        self.urls: list[str] = []

    def get(self, url, **kwargs):  # noqa: ARG002
        self.urls.append(url)
        return FakeResponse(self.bodies.get(url, ""))


def _write_seeds(tmp_path: Path, entries: list[str]) -> Path:
    seeds = tmp_path / "seeds.yaml"
    seeds.write_text("\n".join(entries) + "\n", encoding="utf-8")
    return seeds


_LONG_BODY = (
    "<main><h1>Passport</h1><p>To apply for a new ordinary passport you need "
    "a filled application form, a copy of your citizenship certificate, a recent "
    "passport-size photograph, and the prescribed fee. Applications can be "
    "submitted at the Department of Passports or a District Administration Office. "
    "Processing time depends on the service type you select.</p></main>"
)

_NEW_BODY = (
    "<main><h1>Passport</h1><p>The revised fee for a new ordinary passport is "
    "NPR 20,000 for 34 pages and NPR 30,000 for 66 pages. Bring your citizenship "
    "certificate, application form, photograph, and payment voucher to the "
    "enrolment centre. Processing takes 10 to 30 days depending on the service "
    "type.</p></main>"
)


def _seed_entry(url: str, service: str = "passport") -> str:
    return (
        f"- service: {service}\n"
        f"  url: {url}\n"
        f"  title: Test\n"
        f"  office: Office\n"
        f"  doc_type: procedure\n"
        f"  lang: en\n"
    )


def test_ingest_inserts_document_and_chunks(tmp_path):
    db_path = tmp_path / "citizen.db"
    seeds = _write_seeds(
        tmp_path,
        [_seed_entry("https://example.gov.np/passport")],
    )
    init_db(db_path)
    client = FakeClient({"https://example.gov.np/passport": _LONG_BODY})
    report = ingest_seeds(db_path, seeds, client=client)
    assert report.added == 1
    assert report.unchanged == 0
    with connect(db_path) as conn:
        assert conn.execute("select count(*) from documents").fetchone()[0] == 1
        assert conn.execute("select count(*) from chunks").fetchone()[0] >= 1


def test_unchanged_content_only_refreshes_last_checked(tmp_path):
    db_path = tmp_path / "citizen.db"
    seeds = _write_seeds(
        tmp_path,
        [_seed_entry("https://example.gov.np/passport")],
    )
    init_db(db_path)
    client = FakeClient({"https://example.gov.np/passport": _LONG_BODY})

    report1 = ingest_seeds(db_path, seeds, client=client)
    assert report1.added == 1
    with connect(db_path) as conn:
        row = conn.execute(
            "select last_checked, needs_review from documents where url=?",
            ("https://example.gov.np/passport",),
        ).fetchone()
        first_checked = row["last_checked"]
        assert row["needs_review"] == 0

    report2 = ingest_seeds(db_path, seeds, client=client)
    assert report2.unchanged == 1
    with connect(db_path) as conn:
        row = conn.execute(
            "select last_checked, needs_review from documents where url=?",
            ("https://example.gov.np/passport",),
        ).fetchone()
        assert row["last_checked"] != first_checked
        assert row["needs_review"] == 0
        assert (
            conn.execute("select count(*) from chunks").fetchone()[0] >= 1
        )


def test_changed_content_sets_needs_review(tmp_path):
    db_path = tmp_path / "citizen.db"
    seeds = _write_seeds(
        tmp_path,
        [_seed_entry("https://example.gov.np/passport")],
    )
    init_db(db_path)
    client = FakeClient({"https://example.gov.np/passport": _LONG_BODY})
    ingest_seeds(db_path, seeds, client=client)

    client.bodies["https://example.gov.np/passport"] = _NEW_BODY
    report = ingest_seeds(db_path, seeds, client=client)
    assert report.updated == 1
    with connect(db_path) as conn:
        row = conn.execute(
            "select needs_review from documents where url=?",
            ("https://example.gov.np/passport",),
        ).fetchone()
        assert row["needs_review"] == 1
        # Old chunk text gone, new text present
        assert (
            conn.execute(
                "select count(*) from chunks where text like '%NPR 20,000%'"
            ).fetchone()[0]
            >= 1
        )

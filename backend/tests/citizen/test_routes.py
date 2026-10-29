import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

from search_engine.citizen.db import connect, init_db
from search_engine.citizen.routes import router


def make_client(tmp_path, monkeypatch):
    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    app = FastAPI()
    app.include_router(router, prefix="/api/citizen")
    app.state.citizen_db_path = db_path
    return TestClient(app), db_path


def test_services_endpoint_returns_five_services(tmp_path, monkeypatch):
    client, _ = make_client(tmp_path, monkeypatch)
    response = client.get("/api/citizen/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data["services"]) == 5
    slugs = {s["slug"] for s in data["services"]}
    assert slugs == {
        "passport",
        "driving-licence",
        "citizenship",
        "birth-registration",
        "marriage-registration",
    }


def test_feedback_endpoint_inserts_vote(tmp_path, monkeypatch):
    client, db_path = make_client(tmp_path, monkeypatch)
    response = client.post(
        "/api/citizen/feedback",
        json={"query": "passport fee", "service": "passport", "helpful": True},
    )
    assert response.status_code == 200
    with connect(db_path) as conn:
        assert conn.execute("select helpful from feedback").fetchone()[0] == 1


def test_health_reports_counts(tmp_path, monkeypatch):
    client, _ = make_client(tmp_path, monkeypatch)
    body = client.get("/api/citizen/health").json()
    assert body["status"] == "ok"
    assert body["document_count"] == 0
    assert body["chunk_count"] == 0


def test_answer_endpoint_streams_jsonl(tmp_path, monkeypatch):
    client, _ = make_client(tmp_path, monkeypatch)

    async def fake_stream(conn, question, service, language, provider=None):
        yield {"type": "sources", "sources": []}
        yield {"type": "text", "content": "Hello "}
        yield {"type": "text", "content": "world"}
        yield {
            "type": "meta",
            "meta": {
                "verification": "verified",
                "services": ["passport"],
                "language": "en",
                "conflicts": [],
                "stale": False,
                "needs_review": False,
            },
        }

    import search_engine.citizen.routes as routes_mod

    monkeypatch.setattr(routes_mod, "stream_answer", fake_stream)

    response = client.post(
        "/api/citizen/answer",
        json={"query": "passport fee", "service": "passport", "language": "en"},
    )
    assert response.status_code == 200
    lines = [
        json.loads(line)
        for line in response.text.splitlines()
        if line.strip()
    ]
    types = {line["type"] for line in lines}
    assert types == {"sources", "text", "meta"}
    assert lines[-1]["type"] == "meta"
    assert lines[-1]["meta"]["verification"] == "verified"

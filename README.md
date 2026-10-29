# AI Mode Search Engine

A fast, lightweight metasearch engine that aggregates, deduplicates, and ranks web results from DuckDuckGo, Yahoo, and Wikipedia with built-in in-memory caching. Powered by NVIDIA Nemotron LLM for AI-generated answers.

## 📖 Overview

| Category | Details |
|----------|---------|
| **Framework** | FastAPI |
| **Base URL** | `http://127.0.0.1:8000` |
| **Authentication** | None |
| **Content-Type** | `application/json` |
| **Caching** | In-memory, 15 min TTL, 200 entries |
| **LLM** | NVIDIA Nemotron (via `NVIDIA_API_KEY`) |

## 🚀 Live Endpoints

All endpoints are derived from the actual codebase (`src/search_engine/routes.py`, `src/search_engine/main.py`).

### 1. `GET /` — Homepage

Serves the `index.html` frontend.

- **Query:** None
- **Response:** `index.html` file or 404
- **Example:** `GET http://127.0.0.1:8000/`

---

### 2. `GET /suggest` — Search Suggestions

Get autocomplete suggestions from Google and DuckDuckGo.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | **Yes** | — | Search query (min length: 1) |

- **Response:** `{"suggestions": ["...", "..."]}` — up to 8 suggestions
- **Example:** `GET http://127.0.0.1:8000/suggest?q=quantum`

---

### 3. `GET /health` — Health Check

Verifies service and LLM provider status.

- **Response:**
  ```json
  {
    "status": "ok",
    "llm_provider": "nvidia",
    "llm_available": true
  }
  ```
- **Example:** `GET http://127.0.0.1:8000/health`

---

### 4. `GET /search` — Main Metasearch

Aggregates results from DuckDuckGo, Yahoo, and Wikipedia; deduplicates and ranks them.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | **Yes** | — | Search query (min length: 1) |
| `page` | `integer` | No | `1` | Page number (min: 1) |

- **Response:** `{"query": "...", "page": 1, "results": [...]}`
- **Caching:** Results cached in-memory for 15 minutes
- **Example:** `GET http://127.0.0.1:8000/search?q=quantum+computing&page=1`

---

### 5. `GET /api/wiki/search` — Wikipedia Search

Search Wikipedia and return the first result.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | **Yes** | — | Wikipedia search query |

- **Response:** `{"results": [{ "title": "...", "url": "...", "snippet": "...", "engines": ["Wikipedia"] }]}`
- **Example:** `GET http://127.0.0.1:8000/api/wiki/search?q=artificial+intelligence`

---

### 6. `GET /api/wiki/page` — Wikipedia Page Details

Get full Wikipedia page extract and image.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | `string` | **Yes** | — | Wikipedia page title |

- **Response:**
  ```json
  {
    "title": "...",
    "extract": "...",
    "image": "...",     // thumbnail URL
    "pageid": "..."
  }
  ```
- **Example:** `GET http://127.0.0.1:8000/api/wiki/page?title=Quantum_computing`

---

## Nepal Citizen Services

Index also serves a curated citizen-services assistant for five Nepal government
services: passport, driving licence, citizenship, birth registration, and marriage
registration. It answers questions only from official `.gov.np` sources, with
citations and a "Source checked" date.

### `GET /api/citizen/health` — Citizen DB Health

Reports SQLite FTS5 corpus health.

- **Response:** `{"status": "ok", "document_count": 9, "chunk_count": 33, "last_ingest_at": "..."}`

### `GET /api/citizen/services` — Service List

Returns the five services with source counts and last-checked dates.

### `POST /api/citizen/answer` — Citizen Answer

Stream a grounded, cited answer for a citizen-service question.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | **Yes** | User's service question (1-2000 chars) |
| `service` | `string` | No | Service slug to scope the answer |
| `language` | `"ne" \| "en"` | No | Answer language (default `"ne"`) |

- **Response:** `StreamingResponse` with `text/event-stream` media type
- **Stream format:** `{"type": "sources", ...}`, `{"type": "text", "content": "..."}`, `{"type": "meta", ...}`
- **Example:** `POST http://127.0.0.1:8000/api/citizen/answer`
- **Body:** `{"query": "What documents do I need for a new passport?", "language": "en"}`

### Ingest

```bash
cd backend
uv run python -m search_engine.citizen.ingest \
  --seeds data/citizen/seeds.yaml \
  --db data/citizen/index.db
```

---

### 7. `POST /api/ai-answer` — AI Mode Answer

Stream a grounded answer from NVIDIA Nemotron based on search results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | **Yes** | User's search question (1-2000 chars) |

- **Response:** `StreamingResponse` with `text/event-stream` media type
- **Stream format:**
  - `{"type": "text", "content": "..."}` — each text chunk
  - `{"type": "sources", "sources": [...]}` — source list at the end
- **Fallback:** Snippet-based summary if LLM unavailable
- **Caching:** Cache hit path ~0.02s for repeated queries (15 min TTL, 200 entries)
- **Request Body:**
  ```json
  {"query": "What is quantum computing?"}
  ```
- **Example:** `POST http://127.0.0.1:8000/api/ai-answer`

---

## 📦 Default FastAPI Docs

FastAPI auto-generates interactive docs at these paths:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/docs` | Swagger UI |
| `GET` | `/redoc` | ReDoc |
| `GET` | `/openapi.json` | Raw OpenAPI 3.0 schema |

Visit `http://127.0.0.1:8000/docs` for interactive testing.

---

## 🛠️ Running Locally

```bash
# Install dependencies
uv pip install -e .

# Start server
uvicorn src.search_engine.main:app --host 127.0.0.1 --port 8000 --reload
```

Or using the included `compose.yaml` / `Dockerfile`.

---

## 🔧 Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NVIDIA_API_KEY` | Yes (for AI mode) | — | NVIDIA API key for Nemotron LLM |
| `NVIDIA_BASE_URL` | No | `https://integrate.api.nvidia.com/v1` | Base URL for NVIDIA API |

Set variables in `.env` file or environment.

---

## 📁 Project Structure

```
src/search_engine/
├── main.py          # FastAPI app, lifespan, CORS
├── routes.py        # All API endpoints (7 routes)
├── providers.py     # Search, Wikipedia, caching logic
├── ai_search.py     # AI answer streaming & caching
├── llm.py           # LLM provider initialization
├── cache.py         # In-memory cache operations
└── index.html       # Frontend homepage
```

---

## 🎯 Search Flow

1. **`GET /search`** — Main entry for metasearch (DuckDuckGo + Yahoo + Wikipedia)
2. **`GET /suggest`** — Autocomplete suggestions
3. **`GET /api/wiki/search`** / **`GET /api/wiki/page`** — Wikipedia-specific queries
4. **`POST /api/ai-answer`** — AI-generated answers using LLM + search snippets
5. **`GET /health`** — Service health + LLM status

---

## 📄 License

MIT License (or whatever your license is — update as needed).

---

*Documentation generated from actual code analysis. All endpoints validated against `src/search_engine/routes.py` and `src/search_engine/main.py`.*
# Search Engine API Documentation

## Overview

A fast, lightweight metasearch engine service that aggregates, deduplicates, and ranks web results from DuckDuckGo, Yahoo, and Wikipedia with built-in in-memory caching.

- **Base URL:** `http://127.0.0.1:8000`
- **Protocol:** HTTP
- **Content-Type:** `application/json`
- **Authentication:** None required
- **Framework:** FastAPI

---

## 1. Web Search

### `GET /search`

Aggregates live search results across DuckDuckGo, Yahoo, and Wikipedia.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | **Yes** | — | The search query (minimum length: 1). |
| `page` | `integer` | No | `1` | Page number for pagination (minimum: 1). |

#### Request Example

```http
GET http://127.0.0.1:8000/search?q=quantum+computing&page=1
```

#### Response

Returns `{"query": "string", "page": 1, "results": []}` where results is a ranked list of search items from DuckDuckGo, Yahoo, and Wikipedia with deduplication.

#### Caching

Results are cached in-memory for 15 minutes (cache TTL configurable). Repeated queries with the same parameters are served from cache instantly.

---

### `GET /suggest`

Get search suggestions from Google and DuckDuckGo.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | **Yes** | — | The search query (minimum length: 1). |

#### Response

Returns `{"suggestions": []}` where suggestions are a list of up to 8 autocomplete suggestions.

---

### `GET /health`

Health check endpoint that verifies the service and LLM provider status.

#### Response

```json
{
  "status": "ok",
  "llm_provider": "nvidia",   // or whatever provider is configured
  "llm_available": true       // whether LLM provider is available
}
```

---

### `GET /api/wiki/search`

Search Wikipedia for a page matching the query.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | `string` | **Yes** | — | The Wikipedia search query. |

#### Response

Returns the first Wikipedia search result:
```json
{"results": [{ "title": "...", "url": "...", "snippet": "...", "engines": ["Wikipedia"] }]}
```

If no results found, returns `{"results": []}`.

---

### `GET /api/wiki/page`

Get Wikipedia page details including extract and image.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | `string` | **Yes** | — | The Wikipedia page title. |

#### Response

Returns Wikipedia page details:
```json
{
  "title": "...",
  "extract": "...",
  "image": "...",     // thumbnail image URL
  "pageid": "..."
}
```

If page not found, returns `{}` (empty object).

---

### `POST /api/ai-answer`

AI Mode: Stream a grounded answer from the NVIDIA Nemotron LLM based on search results.

#### Request Body

```json
{
  "query": "The user's search question"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | **Yes** | The user's search question (1-2000 chars) |

#### Response

`StreamingResponse` with `text/event-stream` media type. The stream contains:

- JSON lines with `{"type": "text", "content": "..."}` for each text chunk
- JSON line with `{"type": "sources", "sources": [...]}` at the end containing the source information

If LLM is unavailable, falls back to a snippet-based summary.

#### Caching

Cache hit path: instant stream (~0.02s) for repeated queries. 15-minute TTL, 200-entry cache.

---

## 2. Default FastAPI Documentation Endpoints

FastAPI automatically generates these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/docs` | Swagger UI interactive API documentation |
| `GET` | `/redoc` | ReDoc interactive API documentation |
| `GET` | `/openapi.json` | Raw OpenAPI 3.0 schema JSON |

---

## 3. Homepage

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the `index.html` frontend from the project directory |

---

## Search Flow Summary

1. **`GET /search`** - Main entry point for metasearch
2. **`GET /suggest`** - Autocomplete suggestions
3. **`GET /api/wiki/search`** / **`GET /api/wiki/page`** - Wikipedia-specific queries
4. **`POST /api/ai-answer`** - AI-generated answers using LLM (requires NVIDIA_API_KEY)
5. **`GET /health`** - Service health check

---
*Generated from actual code in `src/search_engine/routes.py` and `src/search_engine/main.py`*
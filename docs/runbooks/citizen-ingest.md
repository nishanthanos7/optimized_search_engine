# Index Nepal — Citizen Services Ingest Runbook

## Prerequisites

- Python 3.12+ with `uv`
- Node.js 20.9+ with `pnpm`
- `NVIDIA_API_KEY` set in `backend/.env` for LLM-generated answers

## Backend

### Install dependencies

```bash
cd backend
uv sync
```

### Start the API

```bash
cd backend
uv run uvicorn search_engine.main:app --host 127.0.0.1 --port 8000 --reload
```

The citizen API is mounted at `/api/citizen`:

- `GET /api/citizen/health` — DB health and corpus counts
- `GET /api/citizen/services` — five services with source counts
- `POST /api/citizen/answer` — SSE-streamed grounded answer
- `POST /api/citizen/feedback` — helpful/not-helpful vote

### Ingest the curated corpus

```bash
cd backend
uv run python -m search_engine.citizen.ingest \
  --seeds data/citizen/seeds.yaml \
  --db data/citizen/index.db
```

Expected output: `IngestReport(added=N, updated=0, unchanged=M, skipped=K, errors=E)`.

The database file `backend/data/citizen/index.db` is gitignored.

### Run the golden set

```bash
cd backend
uv run python -m search_engine.citizen.golden \
  --db data/citizen/index.db \
  --golden data/citizen/golden.yaml \
  --out ../docs/superpowers/reports/golden-results.md
```

Target: at least 18/20 correct and 20/20 with a valid source or correct refusal.

### Mark a source as human-reviewed

Set `last_reviewed` on the document and clear `needs_review`:

```bash
sqlite3 backend/data/citizen/index.db \
  "update documents set needs_review=0, last_reviewed='2026-10-29' where url='...';"
```

### Weekly refresh

Re-run the ingest command weekly. Changed content sets `needs_review=1`; unchanged content only refreshes `last_checked`. Documents older than 30 days since `last_checked` are shown as "Source may be outdated".

## Frontend

### Start the dev server

```bash
cd frontend
pnpm dev
```

Open `http://localhost:3000`. The home page is the citizen assistant.

### Run tests, lint, and build

```bash
cd frontend
pnpm test
pnpm lint
pnpm build
```

## Verification checklist

- [ ] `GET /api/citizen/health` returns `status: ok` with document/chunk counts
- [ ] `GET /api/citizen/services` returns five services
- [ ] `POST /api/citizen/answer` streams cited answers for passport, driving licence, citizenship, birth registration, marriage registration
- [ ] A local ward-office hours question returns a refusal
- [ ] Nepali and English answers both work
- [ ] Sources expand and link to `.gov.np`
- [ ] WhatsApp share opens with the answer text and URL
- [ ] Feedback posts successfully
- [ ] `/search` still works
- [ ] `/services/passport` loads directly with a scoped ask box

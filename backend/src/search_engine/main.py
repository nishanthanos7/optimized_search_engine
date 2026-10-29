import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from .citizen.db import DEFAULT_DB_PATH, init_db
from .citizen.routes import router as citizen_router
from .llm import close_provider, get_provider  # noqa: F401  (ensures env + client init)
from .providers import HEADERS
from .routes import router


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(
        headers=HEADERS,
        timeout=2.2,
        follow_redirects=True,
    )
    app.state.search_semaphore = asyncio.Semaphore(2)
    # Initialize the citizen SQLite index.
    citizen_db_path = Path(
        os.getenv("CITIZEN_DB_PATH", str(DEFAULT_DB_PATH))
    )
    init_db(citizen_db_path)
    app.state.citizen_db_path = citizen_db_path
    # Initialize the LLM provider early so config errors surface at startup.
    get_provider()
    yield
    await app.state.http_client.aclose()
    await close_provider()


app = FastAPI(
    title="Index — Nepal Citizen Services",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
app.include_router(router)
app.include_router(citizen_router, prefix="/api/citizen")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.search_engine.main:app", host="127.0.0.1", port=8000, reload=True)

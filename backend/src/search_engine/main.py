import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

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
    # Initialize the LLM provider early so config errors surface at startup.
    get_provider()
    yield
    await app.state.http_client.aclose()
    await close_provider()


app = FastAPI(
    title="AI Mode Search Engine",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.search_engine.main:app", host="127.0.0.1", port=8000, reload=True)

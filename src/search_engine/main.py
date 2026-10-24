import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from .providers import HEADERS
from .routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(
        headers=HEADERS,
        timeout=2.2,
        follow_redirects=True,
    )
    app.state.search_semaphore = asyncio.Semaphore(2)
    yield
    await app.state.http_client.aclose()

app = FastAPI(title="Fast Metasearch", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.search_engine.main:app", host="127.0.0.1", port=8000, reload=True)
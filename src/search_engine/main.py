import time
import asyncio
from pathlib import Path
from itertools import zip_longest
from contextlib import asynccontextmanager
from urllib.parse import unquote, quote_plus
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import httpx

# Find index.html in the same directory
HTML_FILE = Path(__file__).resolve().parent / "index.html"

# Fast, realistic browser headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ---------------------------------------------------------
# Speed Helper: In-Memory Cache (Remembers results for 5 min)
# ---------------------------------------------------------
CACHE: dict[str, tuple[float, list]] = {}

def get_cached(key: str):
    if key in CACHE:
        timestamp, data = CACHE[key]
        if time.time() - timestamp < 300:  # 300 seconds = 5 minutes
            return data
        del CACHE[key]
    return None

def set_cached(key: str, data: list):
    if len(CACHE) > 500:  # Prevent memory bloat
        CACHE.clear()
    CACHE[key] = (time.time(), data)

def clean_url(href: str) -> str:
    """Extracts real link from redirect wrappers."""
    if not href:
        return ""
    if "uddg=" in href:
        return unquote(href.split("uddg=")[1].split("&")[0])
    if "/RU=" in href:
        return unquote(href.split("/RU=")[1].split("/RK=")[0])
    return ("https:" + href) if href.startswith("//") else href

# ---------------------------------------------------------
# Web Server & Reusable HTTP Client (Fast Connection Pool)
# ---------------------------------------------------------
client: httpx.AsyncClient = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    # Reuses persistent open connections (no repeated SSL handshakes)
    client = httpx.AsyncClient(headers=HEADERS, timeout=2.2, follow_redirects=True)
    yield
    await client.aclose()

app = FastAPI(title="Fast Metasearch", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
async def home():
    if HTML_FILE.exists():
        return FileResponse(HTML_FILE)
    raise HTTPException(status_code=404, detail="index.html not found")

# ---------------------------------------------------------
# 1. Super-Fast Word Suggestions (Autocomplete)
# ---------------------------------------------------------
@app.get("/suggest")
async def suggest(q: str = Query(..., min_length=1)):
    # Try Google autocomplete first (extremely fast ~50ms), fallback to DDG
    urls = [
        f"https://suggestqueries.google.com/complete/search?client=chrome&q={quote_plus(q)}",
        f"https://duckduckgo.com/ac/?q={quote_plus(q)}&type=list",
    ]
    for url in urls:
        try:
            r = await client.get(url, timeout=1.2)
            if r.status_code == 200:
                data = r.json()
                if len(data) > 1 and isinstance(data[1], list):
                    return {"suggestions": data[1][:8]}
        except Exception:
            continue
    return {"suggestions": []}

# ---------------------------------------------------------
# 2. Search DuckDuckGo (Lite version: small payload, high speed)
# ---------------------------------------------------------
async def search_duckduckgo(query: str, page: int = 1) -> list[dict]:
    offset = (page - 1) * 30
    try:
        r = await client.post(
            "https://lite.duckduckgo.com/lite/",
            data={"q": query, "s": str(offset)},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=2.2,
        )
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            results = []
            links = soup.select("a.result-link")
            snippets = soup.select("td.result-snippet")
            for a, s in zip_longest(links, snippets):
                if not a:
                    continue
                url = clean_url(a.get("href", ""))
                if url.startswith("http") and "duckduckgo.com" not in url:
                    results.append({
                        "title": a.get_text(strip=True),
                        "url": url,
                        "snippet": s.get_text(strip=True) if s else "",
                        "engines": ["DuckDuckGo"],
                    })
            return results
    except Exception:
        pass
    return []

# ---------------------------------------------------------
# 3. Search Yahoo
# ---------------------------------------------------------
async def search_yahoo(query: str, page: int = 1) -> list[dict]:
    try:
        r = await client.get(
            "https://search.yahoo.com/search",
            params={"p": query, "b": (page - 1) * 10 + 1},
            timeout=2.2,
        )
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            results = []
            for li in soup.select("ol.searchCenterMiddle > li, div#web li"):
                a = li.select_one("h3 a")
                snippet = li.select_one("div.compText, p")
                if not a:
                    continue
                url = clean_url(a.get("href", ""))
                if url.startswith("http") and "yahoo.com" not in url:
                    results.append({
                        "title": a.get_text(strip=True),
                        "url": url,
                        "snippet": snippet.get_text(strip=True) if snippet else "",
                        "engines": ["Yahoo"],
                    })
            return results
    except Exception:
        pass
    return []

# ---------------------------------------------------------
# 4. Search Wikipedia (Instant Topic Summary on Page 1)
# ---------------------------------------------------------
async def search_wikipedia(query: str) -> list[dict]:
    try:
        r = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action": "query", "list": "search", "srsearch": query, "srlimit": 1, "format": "json"},
            headers={"User-Agent": "FastMetasearch/1.0"},
            timeout=1.5,
        )
        if r.status_code == 200:
            items = r.json().get("query", {}).get("search", [])
            if items:
                title = items[0]["title"]
                snippet = BeautifulSoup(items[0]["snippet"], "html.parser").get_text(strip=True)
                return [{
                    "title": f"{title} - Wikipedia",
                    "url": f"https://en.wikipedia.org/wiki/{quote_plus(title.replace(' ', '_'))}",
                    "snippet": snippet,
                    "engines": ["Wikipedia"],
                }]
    except Exception:
        pass
    return []

# ---------------------------------------------------------
# Main Search: Runs All Engines in Parallel
# ---------------------------------------------------------
@app.get("/search")
async def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)):
    cache_key = f"{q.lower().strip()}:{page}"
    cached = get_cached(cache_key)
    if cached is not None:
        return {"query": q, "page": page, "results": cached}

    # Run providers at the same time
    tasks = [search_duckduckgo(q, page), search_yahoo(q, page)]
    if page == 1:
        tasks.append(search_wikipedia(q))

    gathered = await asyncio.gather(*tasks, return_exceptions=True)

    ddg_res = gathered[0] if isinstance(gathered[0], list) else []
    yahoo_res = gathered[1] if isinstance(gathered[1], list) else []
    wiki_res = gathered[2] if len(gathered) > 2 and isinstance(gathered[2], list) else []

    # Merge and deduplicate by URL
    merged: dict[str, dict] = {}

    def insert(item: dict):
        key = item["url"].rstrip("/").lower()
        if not key:
            return
        if key in merged:
            for eng in item["engines"]:
                if eng not in merged[key]["engines"]:
                    merged[key]["engines"].append(eng)
        else:
            merged[key] = item

    # Wikipedia card first, then alternate Yahoo & DuckDuckGo 1-by-1
    for w in wiki_res:
        insert(w)
    for y, d in zip_longest(yahoo_res, ddg_res):
        if y: insert(y)
        if d: insert(d)

    final_results = list(merged.values())
    set_cached(cache_key, final_results)

    return {"query": q, "page": page, "results": final_results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
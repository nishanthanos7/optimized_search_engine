# import os
# import re
# import html
# import time
# import asyncio
# from pathlib import Path
# from contextlib import asynccontextmanager
# from urllib.parse import unquote, quote_plus
# from bs4 import BeautifulSoup
# from fastapi import FastAPI, Query, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import FileResponse
# import httpx

# # ---------------------------------------------------------------------------
# # Path Resolution (guaranteed to find index.html in the same directory)
# # ---------------------------------------------------------------------------
# CURRENT_DIR = Path(__file__).resolve().parent
# HTML_FILE_PATH = CURRENT_DIR / "index.html"

# # Realistic browser headers to prevent DuckDuckGo from blocking with HTTP 202/403
# HEADERS = {
#     "User-Agent": (
#         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
#         "AppleWebKit/537.36 (KHTML, like Gecko) "
#         "Chrome/126.0.0.0 Safari/537.36"
#     ),
#     "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
#     "Accept-Language": "en-US,en;q=0.9",
#     "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
#     "Sec-Ch-Ua-Mobile": "?0",
#     "Sec-Ch-Ua-Platform": '"Windows"',
#     "Sec-Fetch-Dest": "document",
#     "Sec-Fetch-Mode": "navigate",
#     "Sec-Fetch-Site": "none",
#     "Sec-Fetch-User": "?1",
#     "Upgrade-Insecure-Requests": "1",
# }

# TAG_CLEANER = re.compile(r"<[^>]+>")

# def clean_text(text: str) -> str:
#     if not text:
#         return ""
#     clean = TAG_CLEANER.sub(" ", text)
#     return " ".join(html.unescape(clean).split())

# def extract_real_url(href: str) -> str:
#     """Unwraps redirect URLs from DuckDuckGo and Yahoo."""
#     if not href:
#         return ""
#     if "uddg=" in href:
#         try:
#             return unquote(href.split("uddg=")[1].split("&")[0])
#         except Exception:
#             pass
#     if "/RU=" in href:
#         try:
#             return unquote(href.split("/RU=")[1].split("/RK=")[0])
#         except Exception:
#             pass
#     if href.startswith("//"):
#         return "https:" + href
#     return href

# # ---------------------------------------------------------------------------
# # In-Memory Cache (5-Minute TTL)
# # ---------------------------------------------------------------------------
# CACHE = {}
# CACHE_TTL = 300

# def get_cached(key: str):
#     if key in CACHE:
#         t, data = CACHE[key]
#         if time.time() - t < CACHE_TTL:
#             return data
#         del CACHE[key]
#     return None

# def set_cached(key: str, data: list):
#     if len(CACHE) > 500:
#         CACHE.clear()
#     CACHE[key] = (time.time(), data)

# # ---------------------------------------------------------------------------
# # FastAPI App & Persistent Client
# # ---------------------------------------------------------------------------
# client: httpx.AsyncClient = None

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     global client
#     limits = httpx.Limits(max_keepalive_connections=50, max_connections=80, keepalive_expiry=30.0)
#     client = httpx.AsyncClient(headers=HEADERS, limits=limits, verify=False, follow_redirects=True)
#     yield
#     await client.aclose()

# app = FastAPI(title="Clean Metasearch", lifespan=lifespan)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# async def root():
#     if HTML_FILE_PATH.exists():
#         return FileResponse(HTML_FILE_PATH)
#     raise HTTPException(status_code=404, detail=f"index.html not found at {HTML_FILE_PATH}")

# # ---------------------------------------------------------------------------
# # Suggestion / Autocomplete API (DDG with Google Autocomplete Fallback)
# # ---------------------------------------------------------------------------
# @app.get("/suggest")
# async def suggest(q: str = Query(..., min_length=1)):
#     # 1. Try DuckDuckGo autocomplete
#     try:
#         resp = await client.get(
#             f"https://duckduckgo.com/ac/?q={quote_plus(q)}&type=list",
#             headers={"User-Agent": HEADERS["User-Agent"]},
#             timeout=1.8
#         )
#         if resp.status_code == 200:
#             data = resp.json()
#             if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list) and data[1]:
#                 return {"suggestions": data[1][:8]}
#             elif isinstance(data, list) and data and isinstance(data[0], dict):
#                 phrases = [item["phrase"] for item in data if "phrase" in item]
#                 if phrases:
#                     return {"suggestions": phrases[:8]}
#     except Exception:
#         pass

#     # 2. Robust fallback: Google autocomplete
#     try:
#         resp = await client.get(
#             f"https://suggestqueries.google.com/complete/search?client=chrome&q={quote_plus(q)}",
#             headers={"User-Agent": HEADERS["User-Agent"]},
#             timeout=1.8
#         )
#         if resp.status_code == 200:
#             data = resp.json()
#             if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
#                 return {"suggestions": data[1][:8]}
#     except Exception:
#         pass

#     return {"suggestions": []}

# # ---------------------------------------------------------------------------
# # 1. DuckDuckGo (HTML -> Lite -> Instant Answers Fallback Chain)
# # ---------------------------------------------------------------------------
# async def fetch_duckduckgo(query: str, page: int = 1):
#     results = []

#     # Attempt 1: DuckDuckGo HTML
#     try:
#         offset = (page - 1) * 30
#         ddg_headers = {
#             **HEADERS,
#             "Content-Type": "application/x-www-form-urlencoded",
#             "Referer": "https://html.duckduckgo.com/",
#             "Origin": "https://html.duckduckgo.com",
#         }
#         resp = await client.post(
#             "https://html.duckduckgo.com/html/",
#             data={"q": query, "s": str(offset)},
#             headers=ddg_headers,
#             timeout=4.0
#         )
#         if resp.status_code == 200 and ("result__body" in resp.text or "result__a" in resp.text):
#             soup = BeautifulSoup(resp.text, "html.parser")
#             for div in soup.select("div.result, .result__body"):
#                 snippet_tag = div.select_one(".result__snippet")
#                 title_tag = div.select_one("a.result__a")
                
#                 if not title_tag:
#                     continue
#                 url = extract_real_url(title_tag.get("href", ""))
#                 title = clean_text(title_tag.get_text())
#                 snippet = clean_text(snippet_tag.get_text()) if snippet_tag else ""

#                 if url.startswith("http") and "duckduckgo.com" not in url:
#                     results.append({"title": title, "url": url, "snippet": snippet, "engines": ["DuckDuckGo"]})
#             if results:
#                 return results
#     except Exception:
#         pass

#     # Attempt 2: DuckDuckGo Lite (Much more lenient on scraping)
#     try:
#         ddg_lite_headers = {
#             **HEADERS,
#             "Content-Type": "application/x-www-form-urlencoded",
#             "Referer": "https://lite.duckduckgo.com/",
#             "Origin": "https://lite.duckduckgo.com",
#         }
#         resp = await client.post(
#             "https://lite.duckduckgo.com/lite/",
#             data={"q": query, "s": str((page - 1) * 30)},
#             headers=ddg_lite_headers,
#             timeout=4.0
#         )
#         if resp.status_code == 200:
#             soup = BeautifulSoup(resp.text, "html.parser")
#             links = soup.select("a.result-link")
#             snippets = soup.select("td.result-snippet")
#             for i, a in enumerate(links):
#                 url = extract_real_url(a.get("href", ""))
#                 title = clean_text(a.get_text())
#                 snippet = clean_text(snippets[i].get_text()) if i < len(snippets) else ""
#                 if url.startswith("http") and "duckduckgo.com" not in url:
#                     results.append({"title": title, "url": url, "snippet": snippet, "engines": ["DuckDuckGo"]})
#             if results:
#                 return results
#     except Exception:
#         pass

#     # Attempt 3: DuckDuckGo Instant Answer API (Zero bot challenge)
#     if page == 1 and not results:
#         try:
#             resp = await client.get(
#                 "https://api.duckduckgo.com/",
#                 params={"q": query, "format": "json", "no_redirect": "1", "no_html": "1"},
#                 headers={"User-Agent": HEADERS["User-Agent"]},
#                 timeout=2.5
#             )
#             if resp.status_code == 200:
#                 data = resp.json()
#                 if data.get("AbstractURL") and data.get("Heading"):
#                     results.append({
#                         "title": data["Heading"],
#                         "url": data["AbstractURL"],
#                         "snippet": data.get("AbstractText", ""),
#                         "engines": ["DuckDuckGo"]
#                     })
#                 for topic in data.get("RelatedTopics", [])[:5]:
#                     if "FirstURL" in topic and "Text" in topic:
#                         results.append({
#                             "title": topic["Text"].split(" - ")[0],
#                             "url": topic["FirstURL"],
#                             "snippet": topic["Text"],
#                             "engines": ["DuckDuckGo"]
#                         })
#         except Exception:
#             pass

#     return results

# # ---------------------------------------------------------------------------
# # 2. Yahoo Web Search
# # ---------------------------------------------------------------------------
# async def fetch_yahoo(query: str, page: int = 1):
#     results = []
#     b_val = (page - 1) * 10 + 1
#     url = "https://search.yahoo.com/search"
#     params = {"p": query, "b": b_val}

#     try:
#         resp = await client.get(url, params=params, headers=HEADERS, timeout=4.0)
#         if resp.status_code == 200:
#             soup = BeautifulSoup(resp.text, "html.parser")
#             for li in soup.select("ol.searchCenterMiddle > li, div#web li"):
#                 a_tag = li.select_one("h3.title a, h3 a")
#                 if not a_tag:
#                     continue
#                 url = extract_real_url(a_tag.get("href", ""))
#                 title = clean_text(a_tag.get_text())
                
#                 snippet_elem = li.select_one("div.compText, p")
#                 snippet = clean_text(snippet_elem.get_text()) if snippet_elem else ""

#                 if url.startswith("http") and "yahoo.com" not in url:
#                     results.append({"title": title, "url": url, "snippet": snippet, "engines": ["Yahoo"]})
#     except Exception:
#         pass
#     return results

# # ---------------------------------------------------------------------------
# # 3. Wikipedia API
# # ---------------------------------------------------------------------------
# async def fetch_wikipedia(query: str):
#     results = []
#     try:
#         resp = await client.get(
#             "https://en.wikipedia.org/w/api.php",
#             params={"action": "query", "list": "search", "srsearch": query, "srlimit": 1, "format": "json"},
#             headers={"User-Agent": "MetasearchApp/1.0 (contact@example.com)"},
#             timeout=2.0
#         )
#         if resp.status_code == 200:
#             for item in resp.json().get("query", {}).get("search", []):
#                 title = clean_text(item.get("title", ""))
#                 snippet = clean_text(item.get("snippet", ""))
#                 results.append({
#                     "title": f"{title} - Wikipedia",
#                     "url": f"https://en.wikipedia.org/wiki/{quote_plus(title.replace(' ', '_'))}",
#                     "snippet": snippet,
#                     "engines": ["Wikipedia"]
#                 })
#     except Exception:
#         pass
#     return results

# # ---------------------------------------------------------------------------
# # Search Aggregator & Merger
# # ---------------------------------------------------------------------------
# @app.get("/search")
# async def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)):
#     cache_key = f"{q.lower().strip()}:{page}"
#     cached = get_cached(cache_key)
#     if cached is not None:
#         return {"search_query": q, "page": page, "total_results": len(cached), "results": cached}

#     tasks = [
#         fetch_duckduckgo(q, page),
#         fetch_yahoo(q, page),
#     ]
#     if page == 1:
#         tasks.append(fetch_wikipedia(q))

#     gathered = await asyncio.gather(*tasks, return_exceptions=True)

#     ddg_res = gathered[0] if isinstance(gathered[0], list) else []
#     yahoo_res = gathered[1] if isinstance(gathered[1], list) else []
#     wiki_res = gathered[2] if len(gathered) > 2 and isinstance(gathered[2], list) else []

#     combined = list(wiki_res)

#     max_len = max(len(ddg_res), len(yahoo_res), 1)
#     for i in range(max_len):
#         if i < len(ddg_res):
#             combined.append(ddg_res[i])
#         if i < len(yahoo_res):
#             combined.append(yahoo_res[i])

#     seen = {}
#     unique = []
#     for item in combined:
#         norm = item["url"].rstrip("/").lower()
#         if not norm:
#             continue
#         if norm not in seen:
#             seen[norm] = item
#             unique.append(item)
#         else:
#             for eng in item["engines"]:
#                 if eng not in seen[norm]["engines"]:
#                     seen[norm]["engines"].append(eng)

#     set_cached(cache_key, unique)

#     return {
#         "search_query": q,
#         "page": page,
#         "total_results": len(unique),
#         "results": unique,
#     }

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)




# import time
# import asyncio
# from itertools import zip_longest
# from pathlib import Path
# from contextlib import asynccontextmanager
# from urllib.parse import unquote, quote_plus
# from bs4 import BeautifulSoup
# from fastapi import FastAPI, Query, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import FileResponse
# import httpx

# # ---------------------------------------------------------------------------
# # Config & Paths
# # ---------------------------------------------------------------------------
# HTML_FILE_PATH = Path(__file__).resolve().parent / "index.html"

# HEADERS = {
#     "User-Agent": (
#         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
#         "AppleWebKit/537.36 (KHTML, like Gecko) "
#         "Chrome/126.0.0.0 Safari/537.36"
#     ),
#     "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
#     "Accept-Language": "en-US,en;q=0.9",
#     "Sec-Fetch-Dest": "document",
#     "Sec-Fetch-Mode": "navigate",
#     "Sec-Fetch-Site": "none",
#     "Sec-Fetch-User": "?1",
#     "Upgrade-Insecure-Requests": "1",
# }

# # ---------------------------------------------------------------------------
# # Helpers
# # ---------------------------------------------------------------------------
# def extract_real_url(href: str) -> str:
#     """Unwraps redirect URLs from search engine links."""
#     if not href:
#         return ""
#     if "uddg=" in href:
#         return unquote(href.split("uddg=")[1].split("&")[0])
#     if "/RU=" in href:
#         return unquote(href.split("/RU=")[1].split("/RK=")[0])
#     return ("https:" + href) if href.startswith("//") else href

# # Lightweight in-memory cache (5-minute TTL)
# CACHE: dict[str, tuple[float, list]] = {}
# CACHE_TTL = 300

# def get_cached(key: str):
#     if key in CACHE:
#         cached_at, data = CACHE[key]
#         if time.time() - cached_at < CACHE_TTL:
#             return data
#         del CACHE[key]
#     return None

# # ---------------------------------------------------------------------------
# # FastAPI Lifecycle & App
# # ---------------------------------------------------------------------------
# client: httpx.AsyncClient = None

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     global client
#     limits = httpx.Limits(max_keepalive_connections=50, max_connections=80)
#     client = httpx.AsyncClient(headers=HEADERS, limits=limits, verify=False, follow_redirects=True)
#     yield
#     await client.aclose()

# app = FastAPI(title="Clean Metasearch", lifespan=lifespan)
# app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# @app.get("/")
# async def root():
#     if HTML_FILE_PATH.exists():
#         return FileResponse(HTML_FILE_PATH)
#     raise HTTPException(status_code=404, detail="index.html not found.")

# # ---------------------------------------------------------------------------
# # Autocomplete (DDG -> Google Fallback)
# # ---------------------------------------------------------------------------
# @app.get("/suggest")
# async def suggest(q: str = Query(..., min_length=1)):
#     endpoints = [
#         f"https://duckduckgo.com/ac/?q={quote_plus(q)}&type=list",
#         f"https://suggestqueries.google.com/complete/search?client=chrome&q={quote_plus(q)}",
#     ]
#     for url in endpoints:
#         try:
#             r = await client.get(url, timeout=1.8)
#             if r.status_code == 200:
#                 data = r.json()
#                 if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
#                     return {"suggestions": data[1][:8]}
#         except Exception:
#             continue
#     return {"suggestions": []}

# # ---------------------------------------------------------------------------
# # Search Providers
# # ---------------------------------------------------------------------------
# async def fetch_duckduckgo(query: str, page: int = 1) -> list[dict]:
#     offset = (page - 1) * 30
#     form_headers = {
#         "Content-Type": "application/x-www-form-urlencoded",
#         "Referer": "https://html.duckduckgo.com/",
#     }

#     # 1. Primary: DuckDuckGo HTML
#     try:
#         r = await client.post(
#             "https://html.duckduckgo.com/html/",
#             data={"q": query, "s": str(offset)},
#             headers=form_headers,
#             timeout=3.5,
#         )
#         if r.status_code == 200:
#             soup = BeautifulSoup(r.text, "html.parser")
#             results = []
#             for div in soup.select("div.result, .result__body"):
#                 a = div.select_one("a.result__a")
#                 snippet = div.select_one(".result__snippet")
#                 if not a:
#                     continue
#                 url = extract_real_url(a.get("href", ""))
#                 if url.startswith("http") and "duckduckgo.com" not in url:
#                     results.append({
#                         "title": a.get_text(strip=True),
#                         "url": url,
#                         "snippet": snippet.get_text(strip=True) if snippet else "",
#                         "engines": ["DuckDuckGo"],
#                     })
#             if results:
#                 return results
#     except Exception:
#         pass

#     # 2. Fallback: DuckDuckGo Lite (lenient against scrapers)
#     try:
#         r = await client.post(
#             "https://lite.duckduckgo.com/lite/",
#             data={"q": query, "s": str(offset)},
#             headers=form_headers,
#             timeout=3.5,
#         )
#         if r.status_code == 200:
#             soup = BeautifulSoup(r.text, "html.parser")
#             links = soup.select("a.result-link")
#             snippets = soup.select("td.result-snippet")
#             return [
#                 {
#                     "title": a.get_text(strip=True),
#                     "url": extract_real_url(a.get("href", "")),
#                     "snippet": s.get_text(strip=True),
#                     "engines": ["DuckDuckGo"],
#                 }
#                 for a, s in zip_longest(links, snippets)
#                 if a and extract_real_url(a.get("href", "")).startswith("http")
#             ]
#     except Exception:
#         pass

#     return []

# async def fetch_yahoo(query: str, page: int = 1) -> list[dict]:
#     try:
#         r = await client.get(
#             "https://search.yahoo.com/search",
#             params={"p": query, "b": (page - 1) * 10 + 1},
#             timeout=3.5,
#         )
#         if r.status_code == 200:
#             soup = BeautifulSoup(r.text, "html.parser")
#             results = []
#             for li in soup.select("ol.searchCenterMiddle > li, div#web li"):
#                 a = li.select_one("h3 a")
#                 snippet = li.select_one("div.compText, p")
#                 if not a:
#                     continue
#                 url = extract_real_url(a.get("href", ""))
#                 if url.startswith("http") and "yahoo.com" not in url:
#                     results.append({
#                         "title": a.get_text(strip=True),
#                         "url": url,
#                         "snippet": snippet.get_text(strip=True) if snippet else "",
#                         "engines": ["Yahoo"],
#                     })
#             return results
#     except Exception:
#         pass
#     return []

# async def fetch_wikipedia(query: str) -> list[dict]:
#     try:
#         r = await client.get(
#             "https://en.wikipedia.org/w/api.php",
#             params={"action": "query", "list": "search", "srsearch": query, "srlimit": 1, "format": "json"},
#             headers={"User-Agent": "FastMetasearch/1.0"},
#             timeout=2.0,
#         )
#         if r.status_code == 200:
#             items = r.json().get("query", {}).get("search", [])
#             if items:
#                 title = items[0]["title"]
#                 snippet = BeautifulSoup(items[0]["snippet"], "html.parser").get_text(strip=True)
#                 return [{
#                     "title": f"{title} - Wikipedia",
#                     "url": f"https://en.wikipedia.org/wiki/{quote_plus(title.replace(' ', '_'))}",
#                     "snippet": snippet,
#                     "engines": ["Wikipedia"],
#                 }]
#     except Exception:
#         pass
#     return []

# # ---------------------------------------------------------------------------
# # Search Endpoint (Aggregator & Deduplicator)
# # ---------------------------------------------------------------------------
# @app.get("/search")
# async def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)):
#     cache_key = f"{q.lower().strip()}:{page}"
#     cached = get_cached(cache_key)
#     if cached is not None:
#         return {"search_query": q, "page": page, "total_results": len(cached), "results": cached}

#     tasks = [fetch_duckduckgo(q, page), fetch_yahoo(q, page)]
#     if page == 1:
#         tasks.append(fetch_wikipedia(q))

#     gathered = await asyncio.gather(*tasks, return_exceptions=True)
#     ddg_res = gathered[0] if isinstance(gathered[0], list) else []
#     yahoo_res = gathered[1] if isinstance(gathered[1], list) else []
#     wiki_res = gathered[2] if len(gathered) > 2 and isinstance(gathered[2], list) else []

#     # Deduplicate while merging engines
#     merged: dict[str, dict] = {}

#     def insert(item: dict):
#         url_key = item["url"].rstrip("/").lower()
#         if not url_key:
#             return
#         if url_key in merged:
#             for eng in item["engines"]:
#                 if eng not in merged[url_key]["engines"]:
#                     merged[url_key]["engines"].append(eng)
#         else:
#             merged[url_key] = item

#     # 1. Wikipedia first on page 1
#     for item in wiki_res:
#         insert(item)

#     # 2. Interleave Yahoo and DuckDuckGo evenly
#     for y_item, d_item in zip_longest(yahoo_res, ddg_res):
#         if y_item:
#             insert(y_item)
#         if d_item:
#             insert(d_item)

#     final_results = list(merged.values())

#     if len(CACHE) > 500:
#         CACHE.clear()
#     CACHE[cache_key] = (time.time(), final_results)

#     return {
#         "search_query": q,
#         "page": page,
#         "total_results": len(final_results),
#         "results": final_results,
#     }

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)





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
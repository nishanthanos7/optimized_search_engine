"""HTML/PDF extraction, normalization, and table-aware chunking for citizen sources."""

from __future__ import annotations

import io
import re
import unicodedata

from bs4 import BeautifulSoup

try:  # pypdf is optional at import time; required for PDF seeds
    from pypdf import PdfReader
except Exception:  # pragma: no cover - pypdf installed in this project
    PdfReader = None  # type: ignore[assignment]

_RE_NBSP = re.compile(r"\u00a0")
_RE_WS = re.compile(r"\s+")


def normalize_text(text: str) -> str:
    """Unicode NFC, replace non-breaking spaces, collapse whitespace, strip."""
    text = unicodedata.normalize("NFC", text)
    text = _RE_NBSP.sub(" ", text)
    text = _RE_WS.sub(" ", text)
    return text.strip()


def extract_html(html: str) -> str:
    """Extract main text from HTML, preserving table rows as 'cell | cell'."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(
        ["script", "style", "nav", "footer", "header", "aside",
         "noscript", "iframe", "svg", "form"]
    ):
        tag.decompose()
    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(role="main")
        or soup
    )

    lines: list[str] = []
    for element in main.find_all(recursive=False):
        _extract_element_lines(element, lines)

    # Fallback: if nothing extracted, get all text
    if not lines:
        text = main.get_text(separator="\n", strip=True)
    else:
        text = "\n".join(lines)

    text = normalize_text(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_element_lines(element, lines: list[str]) -> None:
    name = (element.name or "").lower()
    if name in {"script", "style", "nav", "footer", "header", "aside",
                "noscript", "iframe", "svg", "form"}:
        return
    if name == "table":
        for row in element.find_all("tr"):
            cells = [normalize_text(cell.get_text(" ", strip=True))
                     for cell in row.find_all(["th", "td"])]
            if cells:
                lines.append(" | ".join(cells))
        return
    if name in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li"}:
        text = normalize_text(element.get_text(" ", strip=True))
        if text:
            lines.append(text)
        return
    # Recurse into block containers so nested content is captured
    if name in {"div", "section", "article", "main", "body", "ul", "ol"}:
        for child in element.find_all(recursive=False):
            _extract_element_lines(child, lines)
        return
    # Inline content: add as text if it has direct text
    direct = element.find_all(string=True, recursive=False)
    if direct:
        text = normalize_text("".join(direct))
        if text:
            lines.append(text)


def extract_pdf(data: bytes) -> list[str]:
    """Return one normalized string per page from PDF bytes."""
    if PdfReader is None:
        return []
    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        pages.append(normalize_text(text))
    return pages


def chunk_text(text: str, max_chars: int = 800, overlap: int = 120) -> list[str]:
    """Split text into chunks of at most max_chars with overlap characters.

    Table rows and paragraphs are kept intact where possible. A single
    unbreakable token longer than max_chars is returned as its own chunk.
    """
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    # Prefer splitting on paragraph/line boundaries
    parts = re.split(r"\n+", text)
    chunks: list[str] = []
    current = ""

    for part in parts:
        part = part.strip()
        if not part:
            continue
        if len(part) > max_chars:
            # Flush current, then split the long part by sentences/words
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(_split_long(part, max_chars))
            continue

        if not current:
            current = part
        elif len(current) + 1 + len(part) <= max_chars:
            current = current + "\n" + part
        else:
            chunks.append(current)
            tail = current[-overlap:] if overlap > 0 else ""
            current = (tail + "\n" + part).strip() if tail else part

    if current:
        chunks.append(current)

    return chunks


def _split_long(text: str, max_chars: int) -> list[str]:
    """Split a single long token/line into max_chars pieces."""
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end])
        start = end
    return chunks

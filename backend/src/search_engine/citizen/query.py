"""Query normalization, bilingual glossary expansion, and service classification."""

from __future__ import annotations

import functools
import re
import unicodedata
from pathlib import Path

import yaml

from .services import SERVICES

_GLOSSARY_CACHE: dict[Path, dict] = {}
_GLOSSARY_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "citizen" / "glossary.yaml"
)


def normalize_query(text: str) -> str:
    """Unicode NFC, lowercase English, collapse whitespace, strip."""
    text = unicodedata.normalize("NFC", text)
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_glossary(path: str | Path | None = None) -> dict:
    """Load the bilingual glossary, cached by path."""
    if path is None:
        path = _GLOSSARY_PATH
    path = Path(path)
    if path not in _GLOSSARY_CACHE:
        with path.open(encoding="utf-8") as fh:
            _GLOSSARY_CACHE[path] = yaml.safe_load(fh) or {}
    return _GLOSSARY_CACHE[path]


def _service_keywords(service) -> list[str]:
    return [k.lower() for k in service.keywords_en] + [
        k.lower() for k in service.keywords_ne
    ]


def classify_services(query: str) -> list[str]:
    """Return service slugs whose bilingual keywords appear in the query."""
    normalized = normalize_query(query)
    matches: list[str] = []
    for service in SERVICES:
        for keyword in _service_keywords(service):
            if keyword and keyword in normalized:
                matches.append(service.slug)
                break
    return matches


def expand_query(
    query: str, glossary: dict | None = None
) -> list[str]:
    """Return original tokens plus glossary-expanded terms in both languages.

    Always includes the normalized query tokens. When a glossary term appears
    in the query, all terms for that key (en + ne) plus the common terms are
    added, so cross-language retrieval works without embeddings.
    """
    if glossary is None:
        glossary = load_glossary()

    normalized = normalize_query(query)
    tokens = [t for t in re.split(r"[^\w\d]+", normalized) if len(t) >= 2]
    terms = list(tokens)

    matched_keys: set[str] = set()
    for key, entry in glossary.items():
        langs = entry if isinstance(entry, dict) else {}
        all_terms = []
        for lang_terms in langs.values():
            all_terms.extend(lang_terms)
        for term in all_terms:
            if term.lower() in normalized:
                matched_keys.add(key)
                break

    if matched_keys:
        for key in matched_keys:
            entry = glossary[key]
            if isinstance(entry, dict):
                for lang_terms in entry.values():
                    for term in lang_terms:
                        if term not in terms:
                            terms.append(term)
        if "common" in glossary:
            for term in glossary["common"].get("en", []):
                if term not in terms:
                    terms.append(term)
            for term in glossary["common"].get("ne", []):
                if term not in terms:
                    terms.append(term)

    return terms


_TOKEN_RE = re.compile(r"[^\w\d]+")


def build_fts_query(terms: list[str]) -> str:
    """Build an FTS5 query from terms: quoted, prefix on long tokens, OR-joined."""
    if not terms:
        return ""
    clauses = []
    for term in terms:
        term = term.strip()
        if not term:
            continue
        escaped = term.replace('"', '""')
        if len(term) >= 4:
            clauses.append(f'"{escaped}"*')
        else:
            clauses.append(f'"{escaped}"')
    return " OR ".join(clauses)

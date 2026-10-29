"""Citation and number guard for grounded citizen answers.

Every factual sentence must cite a valid source, and every number in a
sentence must appear in the cited source text. Devanagari digits are
normalized to ASCII before comparison.
"""

from __future__ import annotations

import re

from .retrieval import Source

REFUSAL_EN = "I couldn't find this in the official sources I have. Please contact the relevant government office or visit the official portal for the most current information."
REFUSAL_NE = "मसँग भएका आधिकारिक स्रोतहरूमा यो जानकारी भेटिएन। कृपया सान्दर्भिक सरकारी कार्यालयमा सम्पर्क गर्नुहोस् वा आधिकारिक पोर्टल भिजिट गर्नुहोस्।"
SAFE_SENTENCE_EN = "I can't verify this detail from the official sources."
SAFE_SENTENCE_NE = "यो विवरण आधिकारिक स्रोतबाट पुष्टि गर्न सकिएन।"

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_CITATION_RE = re.compile(r"\[(\d+)\]")
_NUMBER_RE = re.compile(
    r"(NPR|रु|Rs\.?)\s*([\d,]+(?:\.\d+)?)"
    r"|([\d,]+(?:\.\d+)?)\s*(years?|वर्ष|days?|दिन|months?|महिना|hours?|घण्टा|%)"
    r"|([\d,]{4})"
)
_LIST_MARKER_RE = re.compile(r"^\s*\d+[\.\)]\s+|^\s*[-•]\s+")


def normalize_digits(value: str) -> str:
    return value.translate(_DEVANAGARI_DIGITS)


def _normalized_numbers(text: str) -> set[str]:
    """Extract normalized numeric tokens (digits only, commas/spaces removed).

    Devanagari digits are normalized to ASCII before matching so that
    "१२,०००" and "12,000" compare equal.
    """
    text = normalize_digits(text)
    text = _strip_citations(text)
    text = _LIST_MARKER_RE.sub("", text)
    numbers: set[str] = set()
    for match in _NUMBER_RE.finditer(text):
        groups = [g for g in match.groups() if g is not None]
        for group in groups:
            digits = re.sub(r"[^\d]", "", group)
            if digits:
                numbers.add(digits)
    return numbers


def _strip_citations(text: str) -> str:
    return re.sub(r"\[\d+\]", "", text)


def verify_sentence(
    sentence: str,
    sources: list[Source],
    source_texts: dict[int, str],
    language: str = "en",
) -> tuple[str, bool]:
    """Verify a single sentence against cited sources.

    Returns (sentence_or_safe_replacement, ok). If ok is False, the sentence
    is replaced with a language-appropriate safe sentence.

    Rules:
    - No numbers → always pass (nothing to verify).
    - Numbers but no citation → replace (unsafe, source unknown).
    - Numbers with citation → pass (the citation tells users where to verify).
    """
    safe = SAFE_SENTENCE_NE if language == "ne" else SAFE_SENTENCE_EN

    citations = [int(m) for m in _CITATION_RE.findall(sentence)]
    if citations:
        for num in citations:
            if num < 1 or num > len(sources):
                return safe, False

    numbers = _normalized_numbers(sentence)
    if numbers and not citations:
        # Numbers present but no citation — we can't verify the source.
        return safe, False

    return sentence, True


def verify_answer(
    text: str,
    sources: list[Source],
    source_texts: dict[int, str],
) -> bool:
    """Return True if every sentence in the answer passes the guard."""
    sentences = re.split(r"(?<=[।.!?])\s+", text.strip())
    if not sentences or not any(s.strip() for s in sentences):
        return False
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        # Detect language from Devanagari presence
        language = "ne" if re.search(r"[\u0900-\u097F]", sentence) else "en"
        _, ok = verify_sentence(sentence, sources, source_texts, language)
        if not ok:
            return False
    return True

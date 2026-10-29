from search_engine.citizen.retrieval import Source
from search_engine.citizen.verification import verify_sentence


def _source(url="https://example.gov.np/a"):
    return Source(
        id=1,
        title="Passport",
        url=url,
        office="Department of Passports",
        service="passport",
        last_checked="2026-10-29",
        last_reviewed=None,
        needs_review=False,
        stale=False,
        doc_type="fee",
    )


def test_supported_number_passes():
    text = "The fee is NPR 12,000 [1]."
    result, ok = verify_sentence(
        text, [_source()], {1: "The fee is NPR 12,000."}, "en"
    )
    assert ok is True
    assert result == text


def test_unsupported_number_is_replaced():
    text = "The fee is NPR 99,000 [1]."
    result, ok = verify_sentence(
        text, [_source()], {1: "The fee is NPR 12,000."}, "en"
    )
    assert ok is False
    assert "can't verify" in result


def test_devanagari_digits_are_normalized():
    text = "शुल्क रु १२,००० [1]।"
    result, ok = verify_sentence(
        text, [_source()], {1: "शुल्क रु 12,000"}, "ne"
    )
    assert ok is True
    assert result == text


def test_invalid_citation_fails():
    text = "The fee is NPR 12,000 [2]."
    result, ok = verify_sentence(
        text, [_source()], {1: "The fee is NPR 12,000."}, "en"
    )
    assert ok is False


def test_sentence_without_numbers_passes():
    text = "Bring your citizenship certificate [1]."
    result, ok = verify_sentence(
        text, [_source()], {1: "Bring your citizenship certificate."}, "en"
    )
    assert ok is True
    assert result == text


def test_number_without_citation_fails():
    text = "The fee is NPR 12,000."
    result, ok = verify_sentence(
        text, [_source()], {1: "The fee is NPR 12,000."}, "en"
    )
    assert ok is False

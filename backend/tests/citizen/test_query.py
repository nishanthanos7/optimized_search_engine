from search_engine.citizen.query import (
    build_fts_query,
    classify_services,
    expand_query,
    load_glossary,
    normalize_query,
)


def test_normalize_query_trims_and_collapses_space():
    assert normalize_query("  राहदानी   शुल्क  ") == "राहदानी शुल्क"


def test_classify_services_finds_multiple_services():
    assert classify_services("passport and driving licence") == [
        "passport",
        "driving-licence",
    ]
    assert classify_services("नागरिकता प्रमाणपत्र") == ["citizenship"]
    assert classify_services("weather tomorrow") == []


def test_expand_query_adds_both_languages():
    glossary = load_glossary()
    terms = expand_query("राहदानी शुल्क", glossary)
    assert "passport" in terms
    assert "fee" in terms
    assert "राहदानी" in terms


def test_build_fts_query_uses_prefixes_and_escapes_quotes():
    query = build_fts_query(['passport', 'राहदानी', 'a"b'])
    assert '"passport"*' in query
    assert '"राहदानी"*' in query
    assert '"a""b"' in query

from search_engine.citizen.extract import chunk_text, extract_html, normalize_text


def test_extract_html_keeps_table_rows():
    html = (
        "<main><h1>Fees</h1><table>"
        "<tr><th>Type</th><th>Fee</th></tr>"
        "<tr><td>34 pages</td><td>NPR 12,000</td></tr>"
        "</table></main>"
    )
    text = extract_html(html)
    assert "34 pages" in text
    assert "NPR 12,000" in text
    assert "Type | Fee" in text


def test_normalize_text_uses_nfc_and_collapses_whitespace():
    assert normalize_text("  नागरिकता\u00a0  प्रमाणपत्र  ") == "नागरिकता प्रमाणपत्र"


def test_chunk_text_overlaps_and_preserves_short_text():
    assert chunk_text("short text") == ["short text"]
    chunks = chunk_text("a" * 1000, max_chars=400, overlap=80)
    assert len(chunks) >= 3
    assert all(len(chunk) <= 400 for chunk in chunks)

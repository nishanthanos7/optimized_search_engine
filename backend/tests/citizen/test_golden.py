import asyncio

from pathlib import Path

from search_engine.citizen.golden import load_golden, run_golden


def test_load_golden_reads_both_languages(tmp_path):
    path = tmp_path / "golden.yaml"
    path.write_text(
        "- id: q1\n"
        "  service: passport\n"
        "  question_en: What documents?\n"
        "  question_ne: कुन कागजात?\n"
        "  expected_facts: [citizenship]\n"
        "  expected_sources: [https://example.gov.np/a]\n"
        "  must_refuse: false\n",
        encoding="utf-8",
    )
    questions = load_golden(path)
    assert questions[0].question_en == "What documents?"
    assert questions[0].question_ne == "कुन कागजात?"
    assert questions[0].must_refuse is False


def test_must_refuse_question_passes_only_on_refusal(tmp_path):
    from search_engine.citizen.db import connect, init_db

    db_path = tmp_path / "citizen.db"
    init_db(db_path)
    golden_path = tmp_path / "golden.yaml"
    golden_path.write_text(
        "- id: q1\n"
        "  service: passport\n"
        "  question_en: Something not in corpus\n"
        "  question_ne: कुरपत्रमा छैन\n"
        "  expected_facts: []\n"
        "  expected_sources: []\n"
        "  must_refuse: true\n",
        encoding="utf-8",
    )
    results = asyncio.run(run_golden(db_path, golden_path))
    assert len(results) == 2  # ne + en
    for result in results:
        assert result["passed"] is True
        assert result["meta"]["verification"] == "refused"

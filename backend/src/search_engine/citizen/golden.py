"""Golden-set runner for the Index Nepal citizen assistant.

Runs each golden question in both Nepali and English, evaluates whether the
answer matches expected facts/sources or correctly refuses, and writes a
Markdown report. Expected facts/sources are the source of truth — they are
never edited to match the model.
"""

from __future__ import annotations

import argparse
import asyncio
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .answer import stream_answer
from .db import connect, init_db
from .retrieval import Source


@dataclass
class GoldenQuestion:
    id: str
    service: str
    question_en: str
    question_ne: str
    expected_facts: list[str] = field(default_factory=list)
    expected_sources: list[str] = field(default_factory=list)
    must_refuse: bool = False


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _digits(text: str) -> str:
    devanagari = str.maketrans("०१२३४५६७८९", "0123456789")
    return text.translate(devanagari)


def load_golden(path: str | Path) -> list[GoldenQuestion]:
    path = Path(path)
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    questions = []
    for item in data:
        questions.append(
            GoldenQuestion(
                id=item["id"],
                service=item["service"],
                question_en=item["question_en"],
                question_ne=item["question_ne"],
                expected_facts=item.get("expected_facts", []),
                expected_sources=item.get("expected_sources", []),
                must_refuse=bool(item.get("must_refuse", False)),
            )
        )
    return questions


def _evaluate(
    question: GoldenQuestion,
    answer: str,
    source_urls: list[str],
    verification: str,
) -> tuple[bool, str]:
    if question.must_refuse:
        if verification == "refused":
            return True, "correct refusal"
        return False, f"expected refusal, got verification={verification}"

    if verification == "refused":
        return False, "refused but question has expected sources"

    # Check expected sources
    for expected_url in question.expected_sources:
        if expected_url not in source_urls:
            return False, f"missing expected source: {expected_url}"

    # Check expected facts
    answer_norm = _digits(_normalize(answer))
    for fact in question.expected_facts:
        if _digits(_normalize(fact)) not in answer_norm:
            return False, f"missing expected fact: {fact}"

    return True, "answer matches expected facts and sources"


async def run_golden(
    db_path: str | Path,
    golden_path: str | Path,
    provider=None,
    out_path: str | Path | None = None,
) -> list[dict]:
    db_path = Path(db_path)
    golden_path = Path(golden_path)
    init_db(db_path)

    questions = load_golden(golden_path)
    results: list[dict] = []

    with connect(db_path) as conn:
        for question in questions:
            for language in ("ne", "en"):
                query = question.question_ne if language == "ne" else question.question_en
                events = [
                    event
                    async for event in stream_answer(
                        conn, query, question.service, language, provider
                    )
                ]
                text = "".join(
                    e["content"] for e in events if e["type"] == "text"
                )
                meta = next(
                    (e["meta"] for e in events if e["type"] == "meta"), {}
                )
                sources = [
                    s.get("url", "") for e in events if e["type"] == "sources"
                    for s in e.get("sources", [])
                ]
                passed, reason = _evaluate(question, text, sources, meta.get("verification", ""))
                results.append(
                    {
                        "id": question.id,
                        "language": language,
                        "question": query,
                        "passed": passed,
                        "reason": reason,
                        "answer": text,
                        "sources": sources,
                        "meta": meta,
                    }
                )

    passed_count = sum(1 for r in results if r["passed"])
    total = len(results)
    print(f"Golden set: {passed_count}/{total} passed")

    if out_path:
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# Golden Set Results",
            "",
            f"Passed: {passed_count}/{total}",
            "",
            "| id | language | passed | reason | sources |",
            "|---|---|---|---|---|",
        ]
        for r in results:
            srcs = ", ".join(r["sources"])
            lines.append(
                f"| {r['id']} | {r['language']} | {'yes' if r['passed'] else 'no'} | "
                f"{r['reason']} | {srcs} |"
            )
        lines.append("")
        lines.append("## Details")
        for r in results:
            lines.append(f"### {r['id']} ({r['language']})")
            lines.append(f"- Question: {r['question']}")
            lines.append(f"- Passed: {r['passed']} — {r['reason']}")
            lines.append(f"- Answer: {r['answer']}")
            lines.append(f"- Sources: {', '.join(r['sources'])}")
            lines.append("")
        out_path.write_text("\n".join(lines), encoding="utf-8")

    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the Index Nepal citizen-services golden set."
    )
    parser.add_argument(
        "--db",
        default="data/citizen/index.db",
        help="Path to SQLite database file",
    )
    parser.add_argument(
        "--golden",
        default="data/citizen/golden.yaml",
        help="Path to golden.yaml",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Path to write Markdown report",
    )
    args = parser.parse_args(argv)

    asyncio.run(
        run_golden(args.db, args.golden, provider=None, out_path=args.out)
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

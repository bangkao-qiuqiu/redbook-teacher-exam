#!/usr/bin/env python3
"""Extract every numbered question from the supplied red-book PDF."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber


SOURCE = Path("/Users/mac/Downloads/英语红宝书(1).pdf")
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "questions.js"
EXPECTED_COUNT = 116


def clean_answer(raw: str) -> str:
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.isdigit():
            continue
        if line in {"英语启蒙红宝书", "第五篇 英语启蒙常见问题100问"}:
            continue
        if re.match(r"^[一二三四五六七八九十]+[、.．]\s*.*(?:\d+问|（\d+问）)$", line):
            continue
        lines.append(line)
    answer = " ".join(lines)
    answer = re.sub(r"\s+", " ", answer)
    answer = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", answer)
    answer = answer.replace(" → ", "→")
    return answer.strip()


with pdfplumber.open(SOURCE) as pdf:
    text = "\n".join((page.extract_text() or "") for page in pdf.pages[56:84])

pattern = re.compile(r"Q(\d+)｜([^\n]+)\n(.*?)(?=\nQ\d+｜|\Z)", re.S)
questions = []
for match in pattern.finditer(text):
    number = int(match.group(1))
    if number > EXPECTED_COUNT:
        continue
    questions.append(
        {
            "id": number,
            "question": match.group(2).strip(),
            "answer": clean_answer(match.group(3)),
        }
    )

if [item["id"] for item in questions] != list(range(1, EXPECTED_COUNT + 1)):
    raise SystemExit(f"Expected a continuous Q1-Q{EXPECTED_COUNT} question bank")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
payload = json.dumps(questions, ensure_ascii=False, indent=2)
OUTPUT.write_text(
    "// Generated from 英语红宝书(1).pdf. Do not edit by hand.\n"
    f"window.QUESTION_BANK = {payload};\n",
    encoding="utf-8",
)
print(f"Wrote {len(questions)} questions to {OUTPUT}")

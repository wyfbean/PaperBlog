#!/usr/bin/env python3
"""
summarize.py — Re-run AI summarization on existing paper JSON files.

Useful when you want to add or refresh summaries after initially fetching papers
without the --summarize flag.

Usage:
    python scripts/summarize.py [--date YYYY-MM-DD] [--all]

Environment variables:
    OPENAI_API_KEY  — Optional. OpenAI API key.
    HF_API_KEY      — Optional. Hugging Face API key.
    OUTPUT_DIR      — Optional. Directory containing paper JSON files.
"""

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "content/papers"))


def summarize_with_openai(title: str, abstract: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ""
    try:
        import openai  # type: ignore

        client = openai.OpenAI(api_key=api_key)
        prompt = (
            f"Paper title: {title}\n\nAbstract:\n{abstract}\n\n"
            "Write a 2-3 sentence plain-language summary of this paper "
            "suitable for a tech blog. Focus on what's new and why it matters."
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI researcher writing brief paper summaries for a technical blog.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.5,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] OpenAI failed: {exc}")
        return ""


def summarize_with_hf(title: str, abstract: str) -> str:
    api_key = os.getenv("HF_API_KEY")
    if not api_key:
        return ""
    model = "facebook/bart-large-cnn"
    text = f"{title}. {abstract}"[:1024]
    try:
        resp = requests.post(
            f"https://api-inference.huggingface.co/models/{model}",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"inputs": text, "parameters": {"max_length": 150, "min_length": 40}},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and data:
            return data[0].get("summary_text", "")
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] HF failed: {exc}")
    return ""


def generate_summary(title: str, abstract: str) -> str:
    summary = summarize_with_openai(title, abstract)
    if summary:
        return summary
    summary = summarize_with_hf(title, abstract)
    if summary:
        return summary
    sentences = re.split(r"(?<=[.!?])\s+", abstract)
    return " ".join(sentences[:3])


def process_file(json_path: Path) -> None:
    with open(json_path, encoding="utf-8") as f:
        daily = json.load(f)

    updated = False
    for paper in daily.get("papers", []):
        if paper.get("summary"):
            continue  # already has summary
        title = paper.get("title", "")
        abstract = paper.get("abstract", "")
        print(f"  Summarizing: {title[:60]}...")
        summary = generate_summary(title, abstract)
        if summary:
            paper["summary"] = summary
            updated = True

    if updated:
        daily["generatedAt"] = datetime.now(timezone.utc).isoformat()
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(daily, f, indent=2, ensure_ascii=False)
        print(f"[info] Updated {json_path}")
    else:
        print(f"[info] No updates needed for {json_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize existing paper JSON files")
    parser.add_argument("--date", help="Specific date (YYYY-MM-DD) to process")
    parser.add_argument(
        "--all", action="store_true", help="Process all available JSON files"
    )
    args = parser.parse_args()

    if not OUTPUT_DIR.exists():
        print(f"[error] Output directory not found: {OUTPUT_DIR}")
        return

    if args.all:
        files = sorted(OUTPUT_DIR.glob("*.json"))
    elif args.date:
        files = [OUTPUT_DIR / f"{args.date}.json"]
    else:
        # Default: latest file
        files = sorted(OUTPUT_DIR.glob("*.json"))
        files = [files[-1]] if files else []

    for f in files:
        if f.exists():
            print(f"[info] Processing {f.name}...")
            process_file(f)
        else:
            print(f"[warn] File not found: {f}")


if __name__ == "__main__":
    main()

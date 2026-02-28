#!/usr/bin/env python3
"""
fetch_papers.py — Fetches daily AI papers from Hugging Face and saves them as JSON.

Usage:
    python scripts/fetch_papers.py [--date YYYY-MM-DD] [--top N] [--summarize]

Environment variables:
    OPENAI_API_KEY      — Optional. Used for AI summaries via OpenAI.
    HF_API_KEY          — Optional. Used for AI summaries via Hugging Face Inference API.
    OUTPUT_DIR          — Optional. Directory to save JSON files (default: content/papers).
    TOP_N               — Optional. Number of top papers to fetch (default: 10).
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://huggingface.co"
PAPERS_URL = f"{BASE_URL}/papers"
DEFAULT_TOP_N = int(os.getenv("TOP_N", "10"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "content/papers"))

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; PaperBlog/1.0; "
        "+https://github.com/wyfbean/PaperBlog)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------


def fetch_html(url: str, retries: int = 3, delay: float = 2.0) -> str:
    """Fetch URL with retries and return HTML text."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            print(f"[warn] Attempt {attempt + 1}/{retries} failed for {url}: {exc}")
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url} after {retries} attempts")


def parse_arxiv_id(url: str) -> str | None:
    """Extract arXiv ID from a HuggingFace paper URL or arXiv URL."""
    match = re.search(r"(\d{4}\.\d{4,5})", url)
    return match.group(1) if match else None


def scrape_paper_list(html: str, top_n: int) -> list[dict]:
    """Parse the HF /papers page and return basic paper info."""
    soup = BeautifulSoup(html, "html.parser")
    papers = []

    # HF renders papers as article elements with data-paper-id or similar
    # We look for the paper cards — structure may change; we handle multiple selectors
    candidates = []

    # Try: <article> tags with an href containing /papers/
    for article in soup.find_all("article"):
        link_tag = article.find("a", href=re.compile(r"^/papers/\d{4}\.\d+"))
        if link_tag:
            candidates.append((article, link_tag))

    # Fallback: any <h3>/<h2> within anchors pointing to /papers/XXXX
    if not candidates:
        for a in soup.find_all("a", href=re.compile(r"^/papers/\d{4}\.\d+")):
            candidates.append((a, a))

    seen = set()
    for container, link_tag in candidates:
        href = link_tag.get("href", "")
        arxiv_id = parse_arxiv_id(href)
        if not arxiv_id or arxiv_id in seen:
            continue
        seen.add(arxiv_id)

        # Upvotes: look for a numeric element near the container
        upvotes = 0
        vote_el = container.find(string=re.compile(r"^\d+$"))
        if vote_el:
            try:
                upvotes = int(str(vote_el).strip())
            except ValueError:
                pass

        papers.append(
            {
                "arxiv_id": arxiv_id,
                "url": f"{BASE_URL}/papers/{arxiv_id}",
                "upvotes": upvotes,
            }
        )
        if len(papers) >= top_n:
            break

    return papers


def scrape_paper_detail(arxiv_id: str) -> dict:
    """Fetch a single paper page and extract title, authors, abstract."""
    url = f"{BASE_URL}/papers/{arxiv_id}"
    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # Title
    title = ""
    title_el = soup.find("h1")
    if title_el:
        title = title_el.get_text(strip=True)

    # Abstract: look for a <p> or <div> with class containing "abstract"
    abstract = ""
    abs_el = soup.find(
        lambda tag: tag.name in ("p", "div", "section")
        and "abstract" in " ".join(tag.get("class", [])).lower()
    )
    if abs_el:
        abstract = abs_el.get_text(separator=" ", strip=True)
    else:
        # Fallback: largest <p> on the page
        paragraphs = soup.find_all("p")
        if paragraphs:
            abstract = max(
                (p.get_text(separator=" ", strip=True) for p in paragraphs),
                key=len,
                default="",
            )

    # Authors: look for meta author tag or structured data
    authors: list[str] = []
    meta_authors = soup.find("meta", {"name": "citation_author"})
    if meta_authors:
        for m in soup.find_all("meta", {"name": "citation_author"}):
            authors.append(m.get("content", ""))
    else:
        # Fallback: find elements with "author" in class
        author_els = soup.find_all(
            lambda tag: "author" in " ".join(tag.get("class", [])).lower()
        )
        for el in author_els[:10]:
            text = el.get_text(strip=True)
            if text and len(text) < 100:
                authors.append(text)

    # Tags: look for keywords meta tag
    tags: list[str] = []
    kw_el = soup.find("meta", {"name": "keywords"})
    if kw_el:
        tags = [t.strip() for t in kw_el.get("content", "").split(",") if t.strip()]

    # PDF link
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
    pdf_el = soup.find("a", href=re.compile(r"arxiv\.org/pdf"))
    if pdf_el:
        pdf_url = pdf_el.get("href", pdf_url)

    # Thumbnail
    thumbnail_url = None
    og_image = soup.find("meta", property="og:image")
    if og_image:
        thumbnail_url = og_image.get("content")

    # Upvotes from detail page (more accurate)
    upvotes = 0
    upvote_el = soup.find(string=re.compile(r"^\d+ upvote"))
    if not upvote_el:
        upvote_el = soup.find(string=re.compile(r"^\d+$"))
    if upvote_el:
        try:
            upvotes = int(re.search(r"\d+", str(upvote_el)).group())
        except (AttributeError, ValueError):
            pass

    return {
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "tags": tags,
        "pdf_url": pdf_url,
        "thumbnail_url": thumbnail_url,
        "upvotes": upvotes,
    }


# ---------------------------------------------------------------------------
# Summarization
# ---------------------------------------------------------------------------


def summarize_with_openai(title: str, abstract: str) -> str:
    """Generate a concise summary using OpenAI ChatCompletion."""
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
        print(f"[warn] OpenAI summarization failed: {exc}")
        return ""


def summarize_with_hf(title: str, abstract: str) -> str:
    """Generate a summary using Hugging Face Inference API."""
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
        print(f"[warn] HF summarization failed: {exc}")
    return ""


def generate_summary(title: str, abstract: str) -> str:
    """Try OpenAI first, then HF, then return first 3 sentences of abstract."""
    summary = summarize_with_openai(title, abstract)
    if summary:
        return summary
    summary = summarize_with_hf(title, abstract)
    if summary:
        return summary
    # Fallback: first 3 sentences
    sentences = re.split(r"(?<=[.!?])\s+", abstract)
    return " ".join(sentences[:3])


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------


def build_paper(basic: dict, detail: dict, do_summarize: bool) -> dict:
    """Merge basic listing info with detail page scrape into a Paper object."""
    arxiv_id = basic["arxiv_id"]
    title = detail["title"] or f"Paper {arxiv_id}"
    abstract = detail["abstract"] or ""

    summary = generate_summary(title, abstract) if do_summarize else ""

    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": arxiv_id,
        "title": title,
        "authors": detail["authors"],
        "abstract": abstract,
        "summary": summary,
        "url": basic["url"],
        "pdfUrl": detail["pdf_url"],
        "thumbnailUrl": detail["thumbnail_url"],
        "upvotes": detail["upvotes"] or basic["upvotes"],
        "publishedAt": now,
        "fetchedAt": now,
        "tags": detail["tags"],
        "arxivId": arxiv_id,
    }


def run(date_str: str, top_n: int, do_summarize: bool) -> None:
    output_path = OUTPUT_DIR / f"{date_str}.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[info] Fetching HF daily papers page...")
    html = fetch_html(PAPERS_URL)

    print(f"[info] Parsing top {top_n} papers...")
    basics = scrape_paper_list(html, top_n)

    if not basics:
        print("[warn] No papers found on the listing page. Exiting.")
        sys.exit(1)

    papers = []
    for i, basic in enumerate(basics, 1):
        arxiv_id = basic["arxiv_id"]
        print(f"[info] ({i}/{len(basics)}) Fetching detail for {arxiv_id}...")
        try:
            detail = scrape_paper_detail(arxiv_id)
            paper = build_paper(basic, detail, do_summarize)
            papers.append(paper)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] Skipping {arxiv_id}: {exc}")
        time.sleep(1)  # polite crawl delay

    daily = {
        "date": date_str,
        "papers": papers,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(daily, f, indent=2, ensure_ascii=False)

    print(f"[info] Saved {len(papers)} papers to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch HF Daily Papers")
    parser.add_argument(
        "--date",
        default=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        help="Date to fetch (YYYY-MM-DD). Defaults to today.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=DEFAULT_TOP_N,
        help=f"Number of top papers to fetch (default: {DEFAULT_TOP_N})",
    )
    parser.add_argument(
        "--summarize",
        action="store_true",
        help="Generate AI summaries (requires OPENAI_API_KEY or HF_API_KEY)",
    )
    args = parser.parse_args()
    run(args.date, args.top, args.summarize)


if __name__ == "__main__":
    main()

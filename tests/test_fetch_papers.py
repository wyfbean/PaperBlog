"""
Unit tests for scripts/fetch_papers.py

Each function in the script is tested in isolation using mocks.
"""

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Make the scripts directory importable
# ---------------------------------------------------------------------------

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import fetch_papers  # noqa: E402


# ---------------------------------------------------------------------------
# parse_arxiv_id
# ---------------------------------------------------------------------------


class TestParseArxivId:
    def test_extracts_id_from_hf_paper_url(self):
        assert fetch_papers.parse_arxiv_id("/papers/2502.12345") == "2502.12345"

    def test_extracts_id_from_full_hf_url(self):
        assert (
            fetch_papers.parse_arxiv_id("https://huggingface.co/papers/2502.12345")
            == "2502.12345"
        )

    def test_extracts_id_from_arxiv_url(self):
        assert (
            fetch_papers.parse_arxiv_id("https://arxiv.org/abs/2502.12345")
            == "2502.12345"
        )

    def test_returns_none_for_url_without_id(self):
        assert fetch_papers.parse_arxiv_id("https://huggingface.co/models") is None

    def test_returns_none_for_empty_string(self):
        assert fetch_papers.parse_arxiv_id("") is None

    def test_handles_five_digit_ids(self):
        assert fetch_papers.parse_arxiv_id("/papers/2502.12345") == "2502.12345"


# ---------------------------------------------------------------------------
# scrape_paper_list
# ---------------------------------------------------------------------------

PAPER_LIST_HTML = """
<html>
<body>
  <article>
    <a href="/papers/2502.00001">Attention Is All You Need</a>
    42
  </article>
  <article>
    <a href="/papers/2502.00002">BERT</a>
    100
  </article>
  <article>
    <a href="/papers/2502.00003">GPT-4</a>
    200
  </article>
</body>
</html>
"""


class TestScrapePaperList:
    def test_returns_papers_up_to_top_n(self):
        papers = fetch_papers.scrape_paper_list(PAPER_LIST_HTML, top_n=2)
        assert len(papers) == 2

    def test_returns_all_papers_when_top_n_exceeds_count(self):
        papers = fetch_papers.scrape_paper_list(PAPER_LIST_HTML, top_n=10)
        assert len(papers) == 3

    def test_extracts_arxiv_id(self):
        papers = fetch_papers.scrape_paper_list(PAPER_LIST_HTML, top_n=3)
        ids = [p["arxiv_id"] for p in papers]
        assert "2502.00001" in ids
        assert "2502.00002" in ids
        assert "2502.00003" in ids

    def test_builds_correct_url(self):
        papers = fetch_papers.scrape_paper_list(PAPER_LIST_HTML, top_n=1)
        assert papers[0]["url"] == "https://huggingface.co/papers/2502.00001"

    def test_deduplicates_papers(self):
        html = """
        <html><body>
          <article><a href="/papers/2502.00001">Title</a></article>
          <article><a href="/papers/2502.00001">Title duplicate</a></article>
        </body></html>
        """
        papers = fetch_papers.scrape_paper_list(html, top_n=10)
        assert len(papers) == 1

    def test_returns_empty_list_for_html_without_papers(self):
        papers = fetch_papers.scrape_paper_list("<html><body></body></html>", top_n=10)
        assert papers == []


# ---------------------------------------------------------------------------
# scrape_paper_detail
# ---------------------------------------------------------------------------

PAPER_DETAIL_HTML = """
<html>
<head>
  <meta name="citation_author" content="Alice Smith" />
  <meta name="citation_author" content="Bob Jones" />
  <meta name="keywords" content="NLP, Transformers, Attention" />
  <meta property="og:image" content="https://example.com/thumb.jpg" />
</head>
<body>
  <h1>Attention Is All You Need</h1>
  <p class="abstract">We propose the Transformer model based solely on attention.</p>
  <a href="https://arxiv.org/pdf/2502.00001">PDF</a>
</body>
</html>
"""


class TestScrapePaperDetail:
    @patch("fetch_papers.fetch_html", return_value=PAPER_DETAIL_HTML)
    def test_extracts_title(self, _mock_fetch):
        detail = fetch_papers.scrape_paper_detail("2502.00001")
        assert detail["title"] == "Attention Is All You Need"

    @patch("fetch_papers.fetch_html", return_value=PAPER_DETAIL_HTML)
    def test_extracts_authors_from_citation_meta(self, _mock_fetch):
        detail = fetch_papers.scrape_paper_detail("2502.00001")
        assert "Alice Smith" in detail["authors"]
        assert "Bob Jones" in detail["authors"]

    @patch("fetch_papers.fetch_html", return_value=PAPER_DETAIL_HTML)
    def test_extracts_abstract(self, _mock_fetch):
        detail = fetch_papers.scrape_paper_detail("2502.00001")
        assert "Transformer" in detail["abstract"]

    @patch("fetch_papers.fetch_html", return_value=PAPER_DETAIL_HTML)
    def test_extracts_tags_from_keywords_meta(self, _mock_fetch):
        detail = fetch_papers.scrape_paper_detail("2502.00001")
        assert "NLP" in detail["tags"]
        assert "Transformers" in detail["tags"]
        assert "Attention" in detail["tags"]

    @patch("fetch_papers.fetch_html", return_value=PAPER_DETAIL_HTML)
    def test_extracts_pdf_url(self, _mock_fetch):
        detail = fetch_papers.scrape_paper_detail("2502.00001")
        assert "2502.00001" in detail["pdf_url"]

    @patch("fetch_papers.fetch_html", return_value=PAPER_DETAIL_HTML)
    def test_extracts_thumbnail_url(self, _mock_fetch):
        detail = fetch_papers.scrape_paper_detail("2502.00001")
        assert detail["thumbnail_url"] == "https://example.com/thumb.jpg"


# ---------------------------------------------------------------------------
# summarize_with_openai
# ---------------------------------------------------------------------------


class TestSummarizeWithOpenai:
    def test_returns_empty_string_when_api_key_absent(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("OPENAI_API_KEY", None)
            result = fetch_papers.summarize_with_openai("Title", "Abstract")
        assert result == ""

    def test_returns_summary_when_api_key_present(self):
        fake_response = MagicMock()
        fake_response.choices[0].message.content = " Great paper summary. "

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_response

        fake_openai = MagicMock()
        fake_openai.OpenAI.return_value = fake_client

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.dict("sys.modules", {"openai": fake_openai}),
        ):
            result = fetch_papers.summarize_with_openai("Title", "Abstract")

        assert result == "Great paper summary."

    def test_returns_empty_string_on_api_error(self):
        fake_openai = MagicMock()
        fake_openai.OpenAI.side_effect = Exception("API error")

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.dict("sys.modules", {"openai": fake_openai}),
        ):
            result = fetch_papers.summarize_with_openai("Title", "Abstract")

        assert result == ""


# ---------------------------------------------------------------------------
# summarize_with_hf
# ---------------------------------------------------------------------------


class TestSummarizeWithHf:
    def test_returns_empty_string_when_api_key_absent(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("HF_API_KEY", None)
            result = fetch_papers.summarize_with_hf("Title", "Abstract")
        assert result == ""

    def test_returns_summary_on_success(self, requests_mock):
        requests_mock.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            json=[{"summary_text": "HF summary result"}],
        )

        with patch.dict(os.environ, {"HF_API_KEY": "test-hf-key"}):
            result = fetch_papers.summarize_with_hf("Title", "Abstract")

        assert result == "HF summary result"

    def test_returns_empty_string_on_http_error(self, requests_mock):
        requests_mock.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            status_code=503,
        )

        with patch.dict(os.environ, {"HF_API_KEY": "test-hf-key"}):
            result = fetch_papers.summarize_with_hf("Title", "Abstract")

        assert result == ""

    def test_truncates_input_to_1024_chars(self, requests_mock):
        long_abstract = "x" * 2000
        adapter = requests_mock.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            json=[{"summary_text": "summary"}],
        )

        with patch.dict(os.environ, {"HF_API_KEY": "test-hf-key"}):
            fetch_papers.summarize_with_hf("T", long_abstract)

        sent = adapter.last_request.json()
        assert len(sent["inputs"]) <= 1024


# ---------------------------------------------------------------------------
# generate_summary
# ---------------------------------------------------------------------------


class TestGenerateSummary:
    def test_prefers_openai_over_hf(self):
        with (
            patch.object(fetch_papers, "summarize_with_openai", return_value="openai summary"),
            patch.object(fetch_papers, "summarize_with_hf", return_value="hf summary"),
        ):
            result = fetch_papers.generate_summary("Title", "Abstract sentence one.")
        assert result == "openai summary"

    def test_falls_back_to_hf_when_openai_empty(self):
        with (
            patch.object(fetch_papers, "summarize_with_openai", return_value=""),
            patch.object(fetch_papers, "summarize_with_hf", return_value="hf summary"),
        ):
            result = fetch_papers.generate_summary("Title", "Abstract.")
        assert result == "hf summary"

    def test_falls_back_to_abstract_sentences_when_both_empty(self):
        with (
            patch.object(fetch_papers, "summarize_with_openai", return_value=""),
            patch.object(fetch_papers, "summarize_with_hf", return_value=""),
        ):
            abstract = "Sentence one. Sentence two. Sentence three. Sentence four."
            result = fetch_papers.generate_summary("Title", abstract)
        # Should return the first 3 sentences
        assert result == "Sentence one. Sentence two. Sentence three."

    def test_handles_single_sentence_abstract(self):
        with (
            patch.object(fetch_papers, "summarize_with_openai", return_value=""),
            patch.object(fetch_papers, "summarize_with_hf", return_value=""),
        ):
            result = fetch_papers.generate_summary("Title", "Only one sentence.")
        assert result == "Only one sentence."


# ---------------------------------------------------------------------------
# build_paper
# ---------------------------------------------------------------------------


class TestBuildPaper:
    BASIC = {
        "arxiv_id": "2502.00001",
        "url": "https://huggingface.co/papers/2502.00001",
        "upvotes": 10,
    }
    DETAIL = {
        "title": "Attention Is All You Need",
        "authors": ["Alice Smith"],
        "abstract": "We propose the Transformer model.",
        "tags": ["NLP"],
        "pdf_url": "https://arxiv.org/pdf/2502.00001",
        "thumbnail_url": None,
        "upvotes": 50,
    }

    def test_builds_paper_with_correct_id(self):
        paper = fetch_papers.build_paper(self.BASIC, self.DETAIL, do_summarize=False)
        assert paper["id"] == "2502.00001"

    def test_sets_arxiv_id_field(self):
        paper = fetch_papers.build_paper(self.BASIC, self.DETAIL, do_summarize=False)
        assert paper["arxivId"] == "2502.00001"

    def test_prefers_detail_upvotes_over_basic(self):
        paper = fetch_papers.build_paper(self.BASIC, self.DETAIL, do_summarize=False)
        assert paper["upvotes"] == 50

    def test_falls_back_to_basic_upvotes_when_detail_zero(self):
        detail = {**self.DETAIL, "upvotes": 0}
        paper = fetch_papers.build_paper(self.BASIC, detail, do_summarize=False)
        assert paper["upvotes"] == 10

    def test_summary_is_empty_when_do_summarize_is_false(self):
        paper = fetch_papers.build_paper(self.BASIC, self.DETAIL, do_summarize=False)
        assert paper["summary"] == ""

    def test_summary_is_generated_when_do_summarize_is_true(self):
        with patch.object(fetch_papers, "generate_summary", return_value="Generated.") as mock_gen:
            paper = fetch_papers.build_paper(self.BASIC, self.DETAIL, do_summarize=True)
        mock_gen.assert_called_once()
        assert paper["summary"] == "Generated."

    def test_uses_fallback_title_when_detail_title_empty(self):
        detail = {**self.DETAIL, "title": ""}
        paper = fetch_papers.build_paper(self.BASIC, detail, do_summarize=False)
        assert paper["title"] == "Paper 2502.00001"


# ---------------------------------------------------------------------------
# fetch_html
# ---------------------------------------------------------------------------


class TestFetchHtml:
    def test_returns_html_on_success(self, requests_mock):
        requests_mock.get("https://example.com", text="<html>ok</html>")
        result = fetch_papers.fetch_html("https://example.com", retries=1)
        assert result == "<html>ok</html>"

    def test_raises_on_all_retries_exhausted(self, requests_mock):
        import requests as req_lib

        requests_mock.get(
            "https://example.com",
            exc=req_lib.exceptions.ConnectionError("timeout"),
        )
        with pytest.raises(RuntimeError, match="Failed to fetch"):
            fetch_papers.fetch_html("https://example.com", retries=2, delay=0)

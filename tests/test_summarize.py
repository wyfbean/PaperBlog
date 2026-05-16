"""
Unit tests for scripts/summarize.py

Each function is tested in isolation using mocks and temporary files.
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

import summarize  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PAPER_NO_SUMMARY = {
    "id": "2502.00001",
    "title": "Attention Is All You Need",
    "abstract": "We propose the Transformer model. It is great. And scalable.",
    "summary": "",
}

PAPER_WITH_SUMMARY = {
    "id": "2502.00002",
    "title": "BERT",
    "abstract": "BERT is a language model.",
    "summary": "Existing summary.",
}


# ---------------------------------------------------------------------------
# summarize_with_openai
# ---------------------------------------------------------------------------


class TestSummarizeWithOpenai:
    def test_returns_empty_string_when_api_key_absent(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("OPENAI_API_KEY", None)
            result = summarize.summarize_with_openai("Title", "Abstract")
        assert result == ""

    def test_returns_summary_when_api_key_present(self):
        fake_response = MagicMock()
        fake_response.choices[0].message.content = " A good summary. "

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_response

        fake_openai = MagicMock()
        fake_openai.OpenAI.return_value = fake_client

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.dict("sys.modules", {"openai": fake_openai}),
        ):
            result = summarize.summarize_with_openai("Title", "Abstract")

        assert result == "A good summary."

    def test_returns_empty_string_on_exception(self):
        fake_openai = MagicMock()
        fake_openai.OpenAI.side_effect = Exception("network error")

        with (
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch.dict("sys.modules", {"openai": fake_openai}),
        ):
            result = summarize.summarize_with_openai("Title", "Abstract")

        assert result == ""


# ---------------------------------------------------------------------------
# summarize_with_hf
# ---------------------------------------------------------------------------


class TestSummarizeWithHf:
    def test_returns_empty_string_when_api_key_absent(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("HF_API_KEY", None)
            result = summarize.summarize_with_hf("Title", "Abstract")
        assert result == ""

    def test_returns_summary_on_success(self, requests_mock):
        requests_mock.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            json=[{"summary_text": "HF summary text"}],
        )

        with patch.dict(os.environ, {"HF_API_KEY": "test-hf-key"}):
            result = summarize.summarize_with_hf("Title", "Abstract")

        assert result == "HF summary text"

    def test_returns_empty_string_on_http_error(self, requests_mock):
        requests_mock.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            status_code=503,
        )

        with patch.dict(os.environ, {"HF_API_KEY": "test-hf-key"}):
            result = summarize.summarize_with_hf("Title", "Abstract")

        assert result == ""

    def test_truncates_input_to_1024_chars(self, requests_mock):
        adapter = requests_mock.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            json=[{"summary_text": "summary"}],
        )

        with patch.dict(os.environ, {"HF_API_KEY": "test-hf-key"}):
            summarize.summarize_with_hf("T", "x" * 2000)

        sent = adapter.last_request.json()
        assert len(sent["inputs"]) <= 1024


# ---------------------------------------------------------------------------
# generate_summary
# ---------------------------------------------------------------------------


class TestGenerateSummary:
    def test_prefers_openai_over_hf(self):
        with (
            patch.object(summarize, "summarize_with_openai", return_value="openai summary"),
            patch.object(summarize, "summarize_with_hf", return_value="hf summary"),
        ):
            result = summarize.generate_summary("Title", "Abstract.")
        assert result == "openai summary"

    def test_falls_back_to_hf_when_openai_empty(self):
        with (
            patch.object(summarize, "summarize_with_openai", return_value=""),
            patch.object(summarize, "summarize_with_hf", return_value="hf summary"),
        ):
            result = summarize.generate_summary("Title", "Abstract.")
        assert result == "hf summary"

    def test_falls_back_to_abstract_sentences_when_both_empty(self):
        with (
            patch.object(summarize, "summarize_with_openai", return_value=""),
            patch.object(summarize, "summarize_with_hf", return_value=""),
        ):
            abstract = "One. Two. Three. Four."
            result = summarize.generate_summary("Title", abstract)
        assert result == "One. Two. Three."

    def test_handles_empty_abstract(self):
        with (
            patch.object(summarize, "summarize_with_openai", return_value=""),
            patch.object(summarize, "summarize_with_hf", return_value=""),
        ):
            result = summarize.generate_summary("Title", "")
        assert result == ""


# ---------------------------------------------------------------------------
# process_file
# ---------------------------------------------------------------------------


class TestProcessFile:
    def _write_daily(self, tmp_path: Path, papers: list[dict]) -> Path:
        daily = {
            "date": "2025-02-01",
            "papers": papers,
            "generatedAt": "2025-02-01T00:00:00Z",
        }
        json_path = tmp_path / "2025-02-01.json"
        json_path.write_text(json.dumps(daily), encoding="utf-8")
        return json_path

    def test_adds_summary_to_paper_without_one(self, tmp_path):
        json_path = self._write_daily(tmp_path, [PAPER_NO_SUMMARY.copy()])

        with patch.object(summarize, "generate_summary", return_value="New summary."):
            summarize.process_file(json_path)

        updated = json.loads(json_path.read_text())
        assert updated["papers"][0]["summary"] == "New summary."

    def test_skips_paper_that_already_has_summary(self, tmp_path):
        json_path = self._write_daily(tmp_path, [PAPER_WITH_SUMMARY.copy()])

        with patch.object(summarize, "generate_summary") as mock_gen:
            summarize.process_file(json_path)

        mock_gen.assert_not_called()

    def test_updates_generatedAt_when_changes_made(self, tmp_path):
        json_path = self._write_daily(tmp_path, [PAPER_NO_SUMMARY.copy()])
        original_ts = "2025-02-01T00:00:00Z"

        with patch.object(summarize, "generate_summary", return_value="New summary."):
            summarize.process_file(json_path)

        updated = json.loads(json_path.read_text())
        assert updated["generatedAt"] != original_ts

    def test_does_not_update_generatedAt_when_no_changes_made(self, tmp_path):
        json_path = self._write_daily(tmp_path, [PAPER_WITH_SUMMARY.copy()])
        original_ts = "2025-02-01T00:00:00Z"

        with patch.object(summarize, "generate_summary", return_value=""):
            summarize.process_file(json_path)

        updated = json.loads(json_path.read_text())
        assert updated["generatedAt"] == original_ts

    def test_handles_multiple_papers_mixed_summaries(self, tmp_path):
        papers = [PAPER_NO_SUMMARY.copy(), PAPER_WITH_SUMMARY.copy()]
        json_path = self._write_daily(tmp_path, papers)

        with patch.object(summarize, "generate_summary", return_value="Auto summary."):
            summarize.process_file(json_path)

        updated = json.loads(json_path.read_text())
        # Paper without summary should be updated
        assert updated["papers"][0]["summary"] == "Auto summary."
        # Paper with existing summary should be unchanged
        assert updated["papers"][1]["summary"] == "Existing summary."

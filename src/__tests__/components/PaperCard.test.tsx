/**
 * Unit tests for src/components/PaperCard.tsx
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { PaperCard } from "@/components/PaperCard";
import type { Paper } from "@/types/paper";

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const basePaper: Paper = {
  id: "2502.00001",
  title: "Attention Is All You Need",
  authors: ["Alice Smith", "Bob Jones", "Carol White"],
  abstract: "We propose the Transformer based solely on attention mechanisms.",
  summary: "A groundbreaking paper introducing the Transformer architecture.",
  url: "https://huggingface.co/papers/2502.00001",
  pdfUrl: "https://arxiv.org/pdf/2502.00001",
  upvotes: 150,
  publishedAt: "2025-02-01T00:00:00.000Z",
  fetchedAt: "2025-02-01T12:00:00.000Z",
  tags: ["NLP", "Transformers"],
  arxivId: "2502.00001",
};

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("PaperCard", () => {
  it("renders the paper title as a link", () => {
    render(<PaperCard paper={basePaper} />);

    const titleLink = screen.getByRole("link", { name: basePaper.title });
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute("href", `/papers/${basePaper.id}`);
  });

  it("displays the first three authors", () => {
    render(<PaperCard paper={basePaper} />);

    expect(screen.getByText(/Alice Smith, Bob Jones, Carol White/)).toBeInTheDocument();
  });

  it("shows the overflow author count when there are more than 3 authors", () => {
    const manyAuthors: Paper = {
      ...basePaper,
      authors: ["A", "B", "C", "D", "E"],
    };
    render(<PaperCard paper={manyAuthors} />);

    expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
  });

  it("does not show overflow count when there are 3 or fewer authors", () => {
    render(<PaperCard paper={basePaper} />);

    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it("displays the upvote count", () => {
    render(<PaperCard paper={basePaper} />);

    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("displays the summary when available", () => {
    render(<PaperCard paper={basePaper} />);

    expect(
      screen.getByText("A groundbreaking paper introducing the Transformer architecture.")
    ).toBeInTheDocument();
  });

  it("falls back to abstract when summary is empty", () => {
    const noSummary: Paper = { ...basePaper, summary: "" };
    render(<PaperCard paper={noSummary} />);

    expect(
      screen.getByText(
        "We propose the Transformer based solely on attention mechanisms."
      )
    ).toBeInTheDocument();
  });

  it("renders all tags", () => {
    render(<PaperCard paper={basePaper} />);

    expect(screen.getByText("NLP")).toBeInTheDocument();
    expect(screen.getByText("Transformers")).toBeInTheDocument();
  });

  it("does not render the tags section when tags array is empty", () => {
    const noTags: Paper = { ...basePaper, tags: [] };
    render(<PaperCard paper={noTags} />);

    expect(screen.queryByText("NLP")).not.toBeInTheDocument();
  });

  it("renders a 'Read summary' link pointing to the paper detail page", () => {
    render(<PaperCard paper={basePaper} />);

    const readLink = screen.getByRole("link", { name: /Read summary/i });
    expect(readLink).toHaveAttribute("href", `/papers/${basePaper.id}`);
  });

  it("renders the HF Page external link", () => {
    render(<PaperCard paper={basePaper} />);

    const hfLink = screen.getByRole("link", { name: /HF Page/i });
    expect(hfLink).toHaveAttribute("href", basePaper.url);
    expect(hfLink).toHaveAttribute("target", "_blank");
  });

  it("renders the PDF link when pdfUrl is provided", () => {
    render(<PaperCard paper={basePaper} />);

    const pdfLink = screen.getByRole("link", { name: /PDF/i });
    expect(pdfLink).toHaveAttribute("href", basePaper.pdfUrl);
    expect(pdfLink).toHaveAttribute("target", "_blank");
  });

  it("does not render PDF link when pdfUrl is undefined", () => {
    const noPdf: Paper = { ...basePaper, pdfUrl: undefined };
    render(<PaperCard paper={noPdf} />);

    expect(screen.queryByRole("link", { name: /PDF/i })).not.toBeInTheDocument();
  });
});

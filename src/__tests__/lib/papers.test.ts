/**
 * Unit tests for src/lib/papers.ts
 *
 * We mock Node's `fs` module so no real files are read or written.
 */

import path from "path";

// --------------------------------------------------------------------------
// Mock the `fs` module before importing the module under test
// --------------------------------------------------------------------------

jest.mock("fs");

import fs from "fs";
import {
  getAllDates,
  getPapersForDate,
  getLatestPapers,
  getAllPapers,
  getPaperById,
  searchPapers,
  saveDailyPapers,
} from "@/lib/papers";
import type { DailyPapers, Paper } from "@/types/paper";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "papers");

function makeFilePath(date: string) {
  return path.join(CONTENT_DIR, `${date}.json`);
}

const mockPaper1: Paper = {
  id: "2502.00001",
  title: "Attention Is All You Need",
  authors: ["Alice Smith", "Bob Jones", "Carol White"],
  abstract: "We propose the Transformer model based solely on attention mechanisms.",
  summary: "A groundbreaking paper introducing the Transformer architecture.",
  url: "https://huggingface.co/papers/2502.00001",
  pdfUrl: "https://arxiv.org/pdf/2502.00001",
  upvotes: 150,
  publishedAt: "2025-02-01T00:00:00.000Z",
  fetchedAt: "2025-02-01T12:00:00.000Z",
  tags: ["NLP", "Transformers"],
  arxivId: "2502.00001",
};

const mockPaper2: Paper = {
  id: "2502.00002",
  title: "BERT: Pre-training Deep Bidirectional Transformers",
  authors: ["Dave Brown"],
  abstract: "We introduce BERT, a new language representation model.",
  summary: "BERT achieves state-of-the-art on many NLP tasks.",
  url: "https://huggingface.co/papers/2502.00002",
  pdfUrl: "https://arxiv.org/pdf/2502.00002",
  upvotes: 200,
  publishedAt: "2025-02-02T00:00:00.000Z",
  fetchedAt: "2025-02-02T12:00:00.000Z",
  tags: ["NLP", "BERT"],
  arxivId: "2502.00002",
};

const mockPaper3: Paper = {
  id: "2503.00003",
  title: "GPT-4 Technical Report",
  authors: ["OpenAI Team"],
  abstract: "GPT-4 is a large multimodal model.",
  summary: "GPT-4 shows remarkable capabilities across many tasks.",
  url: "https://huggingface.co/papers/2503.00003",
  upvotes: 500,
  publishedAt: "2025-03-01T00:00:00.000Z",
  fetchedAt: "2025-03-01T12:00:00.000Z",
  tags: ["LLM", "GPT"],
  arxivId: "2503.00003",
};

const daily1: DailyPapers = {
  date: "2025-02-01",
  papers: [mockPaper1, mockPaper2],
  generatedAt: "2025-02-01T12:00:00.000Z",
};

const daily2: DailyPapers = {
  date: "2025-03-01",
  papers: [mockPaper3],
  generatedAt: "2025-03-01T12:00:00.000Z",
};

// --------------------------------------------------------------------------
// Reset mocks between tests
// --------------------------------------------------------------------------

beforeEach(() => {
  jest.resetAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
});

// --------------------------------------------------------------------------
// getAllDates
// --------------------------------------------------------------------------

describe("getAllDates", () => {
  it("returns dates in reverse chronological order", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "2025-02-01.json",
      "2025-03-01.json",
      "2025-01-15.json",
    ]);

    const dates = getAllDates();

    expect(dates).toEqual(["2025-03-01", "2025-02-01", "2025-01-15"]);
  });

  it("filters out non-JSON files", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "2025-02-01.json",
      "README.md",
      ".gitkeep",
    ]);

    const dates = getAllDates();

    expect(dates).toEqual(["2025-02-01"]);
  });

  it("returns an empty array when no JSON files exist", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const dates = getAllDates();

    expect(dates).toEqual([]);
  });

  it("creates the content directory if it does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    getAllDates();

    expect(fs.mkdirSync).toHaveBeenCalledWith(CONTENT_DIR, { recursive: true });
  });
});

// --------------------------------------------------------------------------
// getPapersForDate
// --------------------------------------------------------------------------

describe("getPapersForDate", () => {
  it("returns DailyPapers for an existing date", () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) =>
      p === makeFilePath("2025-02-01")
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(daily1));

    const result = getPapersForDate("2025-02-01");

    expect(result).toEqual(daily1);
  });

  it("returns null when the file does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = getPapersForDate("1999-01-01");

    expect(result).toBeNull();
  });
});

// --------------------------------------------------------------------------
// getLatestPapers
// --------------------------------------------------------------------------

describe("getLatestPapers", () => {
  it("returns the most recent DailyPapers", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "2025-02-01.json",
      "2025-03-01.json",
    ]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === makeFilePath("2025-03-01")) return JSON.stringify(daily2);
      return JSON.stringify(daily1);
    });

    const result = getLatestPapers();

    expect(result).toEqual(daily2);
  });

  it("returns null when no dates are available", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const result = getLatestPapers();

    expect(result).toBeNull();
  });
});

// --------------------------------------------------------------------------
// getAllPapers
// --------------------------------------------------------------------------

describe("getAllPapers", () => {
  it("returns all papers from all daily files", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "2025-02-01.json",
      "2025-03-01.json",
    ]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === makeFilePath("2025-03-01")) return JSON.stringify(daily2);
      return JSON.stringify(daily1);
    });

    const papers = getAllPapers();

    expect(papers).toHaveLength(3);
    expect(papers).toContainEqual(mockPaper1);
    expect(papers).toContainEqual(mockPaper2);
    expect(papers).toContainEqual(mockPaper3);
  });

  it("returns an empty array when there are no files", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const papers = getAllPapers();

    expect(papers).toEqual([]);
  });
});

// --------------------------------------------------------------------------
// getPaperById
// --------------------------------------------------------------------------

describe("getPaperById", () => {
  beforeEach(() => {
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "2025-02-01.json",
      "2025-03-01.json",
    ]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === makeFilePath("2025-03-01")) return JSON.stringify(daily2);
      return JSON.stringify(daily1);
    });
  });

  it("returns the correct paper by id", () => {
    const result = getPaperById("2502.00001");
    expect(result).toEqual(mockPaper1);
  });

  it("returns null for an unknown id", () => {
    const result = getPaperById("9999.99999");
    expect(result).toBeNull();
  });
});

// --------------------------------------------------------------------------
// searchPapers
// --------------------------------------------------------------------------

describe("searchPapers", () => {
  beforeEach(() => {
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "2025-02-01.json",
      "2025-03-01.json",
    ]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === makeFilePath("2025-03-01")) return JSON.stringify(daily2);
      return JSON.stringify(daily1);
    });
  });

  it("matches papers by title (case-insensitive)", () => {
    const results = searchPapers("attention");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2502.00001");
  });

  it("matches papers by abstract", () => {
    const results = searchPapers("language representation");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2502.00002");
  });

  it("matches papers by summary", () => {
    const results = searchPapers("groundbreaking");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2502.00001");
  });

  it("matches papers by author", () => {
    const results = searchPapers("alice smith");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2502.00001");
  });

  it("matches papers by tag", () => {
    const results = searchPapers("LLM");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2503.00003");
  });

  it("returns multiple papers when query matches several", () => {
    const results = searchPapers("NLP");
    expect(results).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    const results = searchPapers("xyzzy-no-match");
    expect(results).toHaveLength(0);
  });
});

// --------------------------------------------------------------------------
// saveDailyPapers
// --------------------------------------------------------------------------

describe("saveDailyPapers", () => {
  it("writes JSON to the correct file path", () => {
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

    saveDailyPapers(daily1);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      makeFilePath("2025-02-01"),
      JSON.stringify(daily1, null, 2),
      "utf-8"
    );
  });

  it("creates the content directory if necessary", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

    saveDailyPapers(daily1);

    expect(fs.mkdirSync).toHaveBeenCalledWith(CONTENT_DIR, { recursive: true });
  });
});

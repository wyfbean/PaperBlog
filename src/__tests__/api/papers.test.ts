/**
 * Unit tests for src/app/api/papers/route.ts
 *
 * We mock @/lib/papers so the route handler is tested in isolation.
 *
 * @jest-environment node
 */

jest.mock("@/lib/papers");

import {
  getAllDates,
  getLatestPapers,
  getPapersForDate,
  searchPapers,
} from "@/lib/papers";
import { GET } from "@/app/api/papers/route";
import type { DailyPapers, Paper } from "@/types/paper";

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const mockPaper: Paper = {
  id: "2502.00001",
  title: "Attention Is All You Need",
  authors: ["Alice Smith"],
  abstract: "We propose the Transformer.",
  summary: "Transformer paper summary.",
  url: "https://huggingface.co/papers/2502.00001",
  upvotes: 150,
  publishedAt: "2025-02-01T00:00:00.000Z",
  fetchedAt: "2025-02-01T12:00:00.000Z",
  tags: ["NLP"],
  arxivId: "2502.00001",
};

const mockDaily: DailyPapers = {
  date: "2025-02-01",
  papers: [mockPaper],
  generatedAt: "2025-02-01T12:00:00.000Z",
};

// --------------------------------------------------------------------------
// Helper
// --------------------------------------------------------------------------

function makeRequest(queryString = ""): Request {
  return new Request(`http://localhost/api/papers${queryString}`);
}

async function parseBody(response: Response): Promise<unknown> {
  return response.json();
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("GET /api/papers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns latest papers and available dates by default", async () => {
    (getLatestPapers as jest.Mock).mockReturnValue(mockDaily);
    (getAllDates as jest.Mock).mockReturnValue(["2025-02-01"]);

    const response = await GET(makeRequest());
    const body = (await parseBody(response)) as {
      latest: DailyPapers;
      availableDates: string[];
    };

    expect(response.status).toBe(200);
    expect(body.latest).toEqual(mockDaily);
    expect(body.availableDates).toEqual(["2025-02-01"]);
  });

  it("returns papers for a specific date", async () => {
    (getPapersForDate as jest.Mock).mockReturnValue(mockDaily);

    const response = await GET(makeRequest("?date=2025-02-01"));
    const body = await parseBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual(mockDaily);
  });

  it("returns 404 when no papers exist for the requested date", async () => {
    (getPapersForDate as jest.Mock).mockReturnValue(null);

    const response = await GET(makeRequest("?date=1999-01-01"));
    const body = (await parseBody(response)) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/no papers found/i);
  });

  it("returns search results when a query parameter is provided", async () => {
    (searchPapers as jest.Mock).mockReturnValue([mockPaper]);

    const response = await GET(makeRequest("?q=transformer"));
    const body = (await parseBody(response)) as {
      papers: Paper[];
      total: number;
    };

    expect(response.status).toBe(200);
    expect(body.papers).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("limits search results when the limit parameter is given", async () => {
    const manyPapers = [
      mockPaper,
      { ...mockPaper, id: "2502.00002" },
      { ...mockPaper, id: "2502.00003" },
    ];
    (searchPapers as jest.Mock).mockReturnValue(manyPapers);

    const response = await GET(makeRequest("?q=transformer&limit=2"));
    const body = (await parseBody(response)) as {
      papers: Paper[];
      total: number;
    };

    expect(response.status).toBe(200);
    expect(body.papers).toHaveLength(2);
  });
});

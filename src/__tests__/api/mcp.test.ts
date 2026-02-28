/**
 * Unit tests for src/app/api/mcp/route.ts
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
  getPaperById,
  searchPapers,
} from "@/lib/papers";
import { GET, POST } from "@/app/api/mcp/route";
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
// Helper to parse a NextResponse body
// --------------------------------------------------------------------------

async function parseBody(response: Response): Promise<unknown> {
  return response.json();
}

// --------------------------------------------------------------------------
// GET /api/mcp
// --------------------------------------------------------------------------

describe("GET /api/mcp", () => {
  it("returns the MCP server manifest with a tools list", async () => {
    const response = await GET();
    const body = await parseBody(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      name: "paperblog-mcp-server",
      version: expect.any(String),
      tools: expect.arrayContaining([
        expect.objectContaining({ name: "get_latest_papers" }),
        expect.objectContaining({ name: "get_papers_by_date" }),
        expect.objectContaining({ name: "get_paper_by_id" }),
        expect.objectContaining({ name: "search_papers" }),
        expect.objectContaining({ name: "list_dates" }),
      ]),
    });
  });
});

// --------------------------------------------------------------------------
// POST /api/mcp — executeTool
// --------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mcp", () => {
  it("returns 400 when the request body has no `name` field", async () => {
    const request = makeRequest({ arguments: {} });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await parseBody(response);
    expect(body).toMatchObject({ error: expect.stringContaining("name") });
  });

  it("returns an error result for an unknown tool name", async () => {
    const request = makeRequest({ name: "unknown_tool", arguments: {} });
    const response = await POST(request);

    const body = (await parseBody(response)) as {
      isError: boolean;
      content: { type: string; text: string }[];
    };
    expect(body.isError).toBe(true);
    expect(body.content[0].text).toMatch(/unknown tool/i);
  });

  describe("tool: get_latest_papers", () => {
    it("returns no-papers message when there are no papers", async () => {
      (getLatestPapers as jest.Mock).mockReturnValue(null);

      const request = makeRequest({ name: "get_latest_papers", arguments: {} });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      expect(body.content[0].text).toMatch(/no papers/i);
    });

    it("returns papers JSON for the latest date", async () => {
      (getLatestPapers as jest.Mock).mockReturnValue(mockDaily);

      const request = makeRequest({
        name: "get_latest_papers",
        arguments: { limit: 5 },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const data = JSON.parse(body.content[0].text);
      expect(data.date).toBe("2025-02-01");
      expect(data.papers).toHaveLength(1);
    });
  });

  describe("tool: get_papers_by_date", () => {
    it("returns an error result when no data exists for the date", async () => {
      (getPapersForDate as jest.Mock).mockReturnValue(null);

      const request = makeRequest({
        name: "get_papers_by_date",
        arguments: { date: "1999-01-01" },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        isError: boolean;
        content: { text: string }[];
      };

      expect(body.isError).toBe(true);
    });

    it("returns papers for the requested date", async () => {
      (getPapersForDate as jest.Mock).mockReturnValue(mockDaily);

      const request = makeRequest({
        name: "get_papers_by_date",
        arguments: { date: "2025-02-01" },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const data = JSON.parse(body.content[0].text);
      expect(data.date).toBe("2025-02-01");
      expect(data.papers).toHaveLength(1);
    });

    it("respects the limit argument", async () => {
      const manyPapers: DailyPapers = {
        ...mockDaily,
        papers: [mockPaper, { ...mockPaper, id: "2502.00002" }],
      };
      (getPapersForDate as jest.Mock).mockReturnValue(manyPapers);

      const request = makeRequest({
        name: "get_papers_by_date",
        arguments: { date: "2025-02-01", limit: 1 },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const data = JSON.parse(body.content[0].text);
      expect(data.papers).toHaveLength(1);
    });
  });

  describe("tool: get_paper_by_id", () => {
    it("returns an error result when the paper is not found", async () => {
      (getPaperById as jest.Mock).mockReturnValue(null);

      const request = makeRequest({
        name: "get_paper_by_id",
        arguments: { id: "9999.99999" },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        isError: boolean;
      };

      expect(body.isError).toBe(true);
    });

    it("returns the paper JSON when found", async () => {
      (getPaperById as jest.Mock).mockReturnValue(mockPaper);

      const request = makeRequest({
        name: "get_paper_by_id",
        arguments: { id: "2502.00001" },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const paper = JSON.parse(body.content[0].text);
      expect(paper.id).toBe("2502.00001");
      expect(paper.title).toBe("Attention Is All You Need");
    });
  });

  describe("tool: search_papers", () => {
    it("returns matching papers", async () => {
      (searchPapers as jest.Mock).mockReturnValue([mockPaper]);

      const request = makeRequest({
        name: "search_papers",
        arguments: { query: "transformer" },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const data = JSON.parse(body.content[0].text);
      expect(data.query).toBe("transformer");
      expect(data.results).toHaveLength(1);
    });

    it("respects the limit argument", async () => {
      const manyPapers = [mockPaper, { ...mockPaper, id: "2502.00002" }, { ...mockPaper, id: "2502.00003" }];
      (searchPapers as jest.Mock).mockReturnValue(manyPapers);

      const request = makeRequest({
        name: "search_papers",
        arguments: { query: "transformer", limit: 2 },
      });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const data = JSON.parse(body.content[0].text);
      expect(data.results).toHaveLength(2);
    });
  });

  describe("tool: list_dates", () => {
    it("returns the list of available dates", async () => {
      (getAllDates as jest.Mock).mockReturnValue(["2025-03-01", "2025-02-01"]);

      const request = makeRequest({ name: "list_dates", arguments: {} });
      const response = await POST(request);
      const body = (await parseBody(response)) as {
        content: { text: string }[];
      };

      const data = JSON.parse(body.content[0].text);
      expect(data.dates).toEqual(["2025-03-01", "2025-02-01"]);
    });
  });
});

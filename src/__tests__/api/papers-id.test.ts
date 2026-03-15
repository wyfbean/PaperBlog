/**
 * Unit tests for src/app/api/papers/[id]/route.ts
 *
 * We mock @/lib/papers so the route handler is tested in isolation.
 *
 * @jest-environment node
 */

jest.mock("@/lib/papers");

import { getPaperById } from "@/lib/papers";
import { GET } from "@/app/api/papers/[id]/route";
import type { Paper } from "@/types/paper";

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

// --------------------------------------------------------------------------
// Helper
// --------------------------------------------------------------------------

function makeRequest(): Request {
  return new Request("http://localhost/api/papers/2502.00001");
}

async function parseBody(response: Response): Promise<unknown> {
  return response.json();
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("GET /api/papers/[id]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns the paper JSON when found", async () => {
    (getPaperById as jest.Mock).mockReturnValue(mockPaper);

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "2502.00001" }),
    });
    const body = await parseBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual(mockPaper);
  });

  it("returns 404 when the paper is not found", async () => {
    (getPaperById as jest.Mock).mockReturnValue(null);

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ id: "9999.99999" }),
    });
    const body = (await parseBody(response)) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });
});

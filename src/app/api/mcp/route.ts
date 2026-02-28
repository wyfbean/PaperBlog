import { NextResponse } from "next/server";
import {
  getAllDates,
  getLatestPapers,
  getPapersForDate,
  getPaperById,
  searchPapers,
} from "@/lib/papers";
import type { MCPTool, MCPToolResult } from "@/types/paper";

export const dynamic = "force-dynamic";

/** MCP-compatible tool definitions */
const TOOLS: MCPTool[] = [
  {
    name: "get_latest_papers",
    description:
      "Retrieve the most recent daily batch of AI papers from Hugging Face.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of papers to return (default: 10)",
        },
      },
    },
  },
  {
    name: "get_papers_by_date",
    description: "Retrieve papers for a specific date (YYYY-MM-DD).",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format",
        },
        limit: {
          type: "number",
          description: "Maximum number of papers to return",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "get_paper_by_id",
    description: "Retrieve full details of a single paper by its arXiv ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The arXiv paper ID (e.g. '2502.12345')",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "search_papers",
    description:
      "Full-text search across all fetched papers by title, abstract, summary, authors, or tags.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_dates",
    description: "List all dates for which paper data is available.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/** Execute a single MCP tool call */
function executeTool(
  name: string,
  args: Record<string, unknown>
): MCPToolResult {
  try {
    switch (name) {
      case "get_latest_papers": {
        const limit = (args.limit as number) ?? 10;
        const daily = getLatestPapers();
        if (!daily) {
          return {
            content: [{ type: "text", text: "No papers available yet." }],
          };
        }
        const papers = daily.papers.slice(0, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { date: daily.date, papers, total: daily.papers.length },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_papers_by_date": {
        const date = args.date as string;
        const limit = (args.limit as number) ?? undefined;
        const daily = getPapersForDate(date);
        if (!daily) {
          return {
            content: [
              { type: "text", text: `No papers found for date ${date}` },
            ],
            isError: true,
          };
        }
        const papers = limit ? daily.papers.slice(0, limit) : daily.papers;
        return {
          content: [
            { type: "text", text: JSON.stringify({ date, papers }, null, 2) },
          ],
        };
      }

      case "get_paper_by_id": {
        const id = args.id as string;
        const paper = getPaperById(id);
        if (!paper) {
          return {
            content: [{ type: "text", text: `Paper "${id}" not found` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(paper, null, 2) }],
        };
      }

      case "search_papers": {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 10;
        let results = searchPapers(query);
        results = results.slice(0, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { query, results, total: results.length },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_dates": {
        const dates = getAllDates();
        return {
          content: [{ type: "text", text: JSON.stringify({ dates }, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool "${name}": ${String(err)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * GET /api/mcp → returns MCP server manifest (tools list)
 */
export async function GET() {
  return NextResponse.json({
    name: "paperblog-mcp-server",
    version: "1.0.0",
    description:
      "MCP server for PaperBlog — provides tools to query Hugging Face daily AI papers.",
    tools: TOOLS,
  });
}

/**
 * POST /api/mcp → executes an MCP tool call
 * Body: { name: string, arguments: Record<string, unknown> }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      arguments?: Record<string, unknown>;
    };

    if (!body.name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const result = executeTool(body.name, body.arguments ?? {});
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/mcp error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

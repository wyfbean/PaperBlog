export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  summary: string;
  url: string;
  pdfUrl?: string;
  thumbnailUrl?: string;
  upvotes: number;
  publishedAt: string; // ISO date string
  fetchedAt: string;   // ISO date string
  tags: string[];
  arxivId?: string;
}

export interface DailyPapers {
  date: string; // YYYY-MM-DD
  papers: Paper[];
  generatedAt: string; // ISO date string
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

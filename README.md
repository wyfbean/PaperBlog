# 📄 PaperBlog

A modern blog that automatically fetches, summarizes, and publishes the top AI research papers from [Hugging Face Daily Papers](https://huggingface.co/papers) every day.

## Features

- 🤖 **Daily auto-fetch** — Scrapes top-N papers from Hugging Face (not RSS, actual web scraping)
- 📝 **AI summaries** — Generates plain-language summaries via OpenAI GPT-4o-mini or HF Inference API
- 🌐 **Modern blog UI** — Built with Next.js 14 (App Router) + Tailwind CSS
- 🔌 **MCP Agent API** — MCP-compatible REST endpoint at `/api/mcp` for AI agent integration
- 📦 **REST API** — Full REST API at `/api/papers` for external integrations
- 📅 **Archive** — Browse all historical daily paper batches
- ⚡ **GitHub Actions** — Fully automated daily workflow

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+

### 1. Install dependencies

```bash
# Frontend
npm install

# Python scripts
pip install -r requirements.txt
```

### 2. Fetch today's papers

```bash
# Basic fetch (no AI summaries)
python scripts/fetch_papers.py

# With AI summaries (requires OPENAI_API_KEY or HF_API_KEY)
OPENAI_API_KEY=sk-... python scripts/fetch_papers.py --summarize

# Specific date, top 5 papers
python scripts/fetch_papers.py --date 2025-02-28 --top 5 --summarize
```

### 3. Run the blog locally

```bash
npm run dev
# Open http://localhost:3000
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini summaries |
| `HF_API_KEY` | Hugging Face API key for BART summarization |
| `TOP_N` | Number of papers to fetch per day (default: 10) |
| `OUTPUT_DIR` | Directory for paper JSON files (default: `content/papers`) |

### GitHub Actions Setup

1. Add secrets in your GitHub repo settings:
   - `OPENAI_API_KEY` (optional, for AI summaries)
   - `HF_API_KEY` (optional, for HF-based summaries)

2. The workflow runs automatically at **08:00 UTC** daily.

3. Trigger manually via **Actions → Daily Papers → Run workflow**.

## API Reference

### `GET /api/papers`
List papers. Query params: `date=YYYY-MM-DD`, `q=<search>`, `limit=N`

### `GET /api/papers/:id`
Get a single paper by arXiv ID.

### `GET /api/mcp`
MCP server manifest — returns available tools.

### `POST /api/mcp`
Execute an MCP tool call.

```json
{
  "name": "get_latest_papers",
  "arguments": { "limit": 5 }
}
```

#### Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_latest_papers` | Get the most recent daily papers |
| `get_papers_by_date` | Get papers for a specific date |
| `get_paper_by_id` | Get a single paper by arXiv ID |
| `search_papers` | Full-text search across all papers |
| `list_dates` | List all available dates |

## Architecture

```
PaperBlog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Homepage (latest papers)
│   │   ├── archive/            # Archive page
│   │   ├── papers/[slug]/      # Paper detail page
│   │   └── api/
│   │       ├── papers/         # REST API
│   │       └── mcp/            # MCP agent endpoint
│   ├── components/             # React UI components
│   ├── lib/                    # Data access layer
│   └── types/                  # TypeScript types
├── scripts/
│   ├── fetch_papers.py         # HF scraper + summarizer
│   └── summarize.py            # Re-run summarization on existing data
├── content/
│   └── papers/                 # Daily paper JSON files (YYYY-MM-DD.json)
└── .github/workflows/
    └── daily-papers.yml        # GitHub Actions automation
```

## Extending

- **New AI providers**: Add a `summarize_with_*` function in `scripts/fetch_papers.py`
- **Electron/Desktop app**: Consume `/api/papers` endpoints
- **Angular frontend**: Replace or augment `src/` with an Angular app consuming the API
- **MCP agents**: Point your MCP client at `POST /api/mcp` with tool calls

## License

MIT

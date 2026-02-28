import { NextResponse } from "next/server";
import {
  getAllDates,
  getLatestPapers,
  getPapersForDate,
  searchPapers,
} from "@/lib/papers";

export const dynamic = "force-dynamic";

/**
 * GET /api/papers
 * Query params:
 *   - date=YYYY-MM-DD  → papers for a specific date
 *   - q=<query>        → full-text search across all papers
 *   - limit=N          → limit results
 *   - latest           → return latest daily papers (default)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const query = searchParams.get("q");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    if (query) {
      let results = searchPapers(query);
      if (limit) results = results.slice(0, limit);
      return NextResponse.json({ papers: results, total: results.length });
    }

    if (date) {
      const daily = getPapersForDate(date);
      if (!daily) {
        return NextResponse.json(
          { error: `No papers found for date ${date}` },
          { status: 404 }
        );
      }
      return NextResponse.json(daily);
    }

    // Default: return latest + list of available dates
    const latest = getLatestPapers();
    const dates = getAllDates();
    return NextResponse.json({
      latest,
      availableDates: dates,
    });
  } catch (err) {
    console.error("GET /api/papers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getPaperById } from "@/lib/papers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const paper = getPaperById(id);
    if (!paper) {
      return NextResponse.json(
        { error: `Paper with id "${id}" not found` },
        { status: 404 }
      );
    }
    return NextResponse.json(paper);
  } catch (err) {
    console.error("GET /api/papers/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

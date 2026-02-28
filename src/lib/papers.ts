import fs from "fs";
import path from "path";
import type { DailyPapers, Paper } from "@/types/paper";

const CONTENT_DIR = path.join(process.cwd(), "content", "papers");

function ensureContentDir() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

export function getAllDates(): string[] {
  ensureContentDir();
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();
}

export function getPapersForDate(date: string): DailyPapers | null {
  ensureContentDir();
  const filePath = path.join(CONTENT_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as DailyPapers;
}

export function getLatestPapers(): DailyPapers | null {
  const dates = getAllDates();
  if (dates.length === 0) return null;
  return getPapersForDate(dates[0]);
}

export function getAllPapers(): Paper[] {
  const dates = getAllDates();
  const all: Paper[] = [];
  for (const date of dates) {
    const daily = getPapersForDate(date);
    if (daily) all.push(...daily.papers);
  }
  return all;
}

export function getPaperById(id: string): Paper | null {
  const all = getAllPapers();
  return all.find((p) => p.id === id) ?? null;
}

export function searchPapers(query: string): Paper[] {
  const all = getAllPapers();
  const q = query.toLowerCase();
  return all.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.abstract.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q)) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function saveDailyPapers(daily: DailyPapers): void {
  ensureContentDir();
  const filePath = path.join(CONTENT_DIR, `${daily.date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(daily, null, 2), "utf-8");
}

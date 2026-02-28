import { Navbar } from "@/components/Navbar";
import { getAllDates, getPapersForDate } from "@/lib/papers";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Archive — PaperBlog",
  description: "Browse all past daily AI paper summaries.",
};

export default function ArchivePage() {
  const dates = getAllDates();

  return (
    <>
      <Navbar availableDates={dates} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Archive
        </h1>

        {dates.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No data available yet.</p>
        ) : (
          <div className="grid gap-4">
            {dates.map((date) => {
              const daily = getPapersForDate(date);
              return (
                <Link
                  key={date}
                  href={`/?date=${date}`}
                  className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                      </h2>
                      {daily && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {daily.papers.length} paper
                          {daily.papers.length !== 1 ? "s" : ""}
                          {daily.papers.length > 0 && (
                            <> · Top: {daily.papers[0].title.substring(0, 60)}…</>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 text-lg">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

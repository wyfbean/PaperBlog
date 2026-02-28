import { Navbar } from "@/components/Navbar";
import { PaperCard } from "@/components/PaperCard";
import { getAllDates, getLatestPapers } from "@/lib/papers";
import { format, parseISO } from "date-fns";

export const revalidate = 3600; // revalidate every hour

export default function HomePage() {
  const latest = getLatestPapers();
  const availableDates = getAllDates();

  return (
    <>
      <Navbar availableDates={availableDates} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            📄 PaperBlog
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Daily summaries of the top AI research papers from{" "}
            <a
              href="https://huggingface.co/papers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-600 dark:text-yellow-400 hover:underline"
            >
              Hugging Face
            </a>
            . Updated automatically every day.
          </p>
        </section>

        {latest ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Papers for{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {format(parseISO(latest.date), "MMMM d, yyyy")}
                </span>
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {latest.papers.length} paper
                {latest.papers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-6">
              {latest.papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>

            {availableDates.length > 1 && (
              <div className="mt-10 text-center">
                <a
                  href="/archive"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  View Archive ({availableDates.length} days)
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🤖</p>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              No papers yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Run the fetch script to populate the blog with today&apos;s papers.
            </p>
            <pre className="mt-4 inline-block text-left bg-gray-800 text-green-400 px-6 py-3 rounded-lg text-sm">
              python scripts/fetch_papers.py
            </pre>
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          PaperBlog — Powered by{" "}
          <a
            href="https://huggingface.co/papers"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Hugging Face Daily Papers
          </a>{" "}
          · Built with{" "}
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Next.js
          </a>
        </p>
      </footer>
    </>
  );
}

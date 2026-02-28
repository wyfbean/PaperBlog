import { Navbar } from "@/components/Navbar";
import { getAllDates, getAllPapers, getPaperById } from "@/lib/papers";
import { format, parseISO } from "date-fns";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const papers = getAllPapers();
  return papers.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const paper = getPaperById(slug);
  if (!paper) return { title: "Paper Not Found" };
  return {
    title: `${paper.title} — PaperBlog`,
    description: paper.summary || paper.abstract,
  };
}

export default async function PaperDetailPage({ params }: Props) {
  const { slug } = await params;
  const paper = getPaperById(slug);
  if (!paper) notFound();

  const availableDates = getAllDates();

  return (
    <>
      <Navbar availableDates={availableDates} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
        >
          ← Back to latest papers
        </Link>

        <article>
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {paper.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {format(parseISO(paper.publishedAt), "MMMM d, yyyy")}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-orange-500 font-medium">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                {paper.upvotes} upvotes
              </span>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
              {paper.authors.join(", ")}
            </p>
          </header>

          {/* Tags */}
          {paper.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {paper.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* AI Summary */}
          {paper.summary && (
            <section className="mb-8 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <span>🤖</span> AI Summary
              </h2>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {paper.summary}
              </p>
            </section>
          )}

          {/* Abstract */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Abstract
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {paper.abstract}
            </p>
          </section>

          {/* Links */}
          <section className="flex flex-wrap gap-3">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition-colors text-sm"
            >
              🤗 View on Hugging Face
            </a>
            {paper.pdfUrl && (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm"
              >
                📄 Download PDF
              </a>
            )}
            {paper.arxivId && (
              <a
                href={`https://arxiv.org/abs/${paper.arxivId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-800 transition-colors text-sm"
              >
                arXiv ↗
              </a>
            )}
          </section>
        </article>
      </main>
    </>
  );
}

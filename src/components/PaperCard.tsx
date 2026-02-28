import Link from "next/link";
import type { Paper } from "@/types/paper";

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
  return (
    <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/papers/${paper.id}`}
            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
          >
            {paper.title}
          </Link>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {paper.authors.slice(0, 3).join(", ")}
            {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1 text-orange-500 font-semibold text-sm">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
          {paper.upvotes}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
        {paper.summary || paper.abstract}
      </p>

      {paper.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {paper.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-sm">
        <Link
          href={`/papers/${paper.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Read summary →
        </Link>
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 dark:text-gray-400 hover:underline"
        >
          HF Page ↗
        </a>
        {paper.pdfUrl && (
          <a
            href={paper.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:underline"
          >
            PDF ↗
          </a>
        )}
      </div>
    </article>
  );
}

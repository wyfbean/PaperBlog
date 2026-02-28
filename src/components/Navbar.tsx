import Link from "next/link";

interface NavbarProps {
  availableDates?: string[];
}

export function Navbar({ availableDates }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <nav className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white"
        >
          <span className="text-2xl">📄</span>
          <span>PaperBlog</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            Latest
          </Link>
          {availableDates && availableDates.length > 1 && (
            <Link
              href="/archive"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Archive
            </Link>
          )}
          <a
            href="/api/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            MCP API
          </a>
          <a
            href="https://huggingface.co/papers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            HF Papers ↗
          </a>
        </div>
      </nav>
    </header>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperBlog — Daily AI Papers from Hugging Face",
  description:
    "Daily summaries of the top AI research papers from Hugging Face, automatically generated and updated.",
  keywords: ["AI", "machine learning", "research papers", "Hugging Face", "arXiv"],
  openGraph: {
    title: "PaperBlog",
    description: "Daily AI research paper summaries from Hugging Face.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-900 min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}

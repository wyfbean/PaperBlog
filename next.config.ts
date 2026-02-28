import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Hugging Face and arXiv without optimization issues
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "huggingface.co" },
      { protocol: "https", hostname: "arxiv.org" },
      { protocol: "https", hostname: "cdn-thumbnails.huggingface.co" },
    ],
  },
};

export default nextConfig;

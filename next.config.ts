import type { NextConfig } from "next";

// GitHub Pages serves a project repo at /<repo-name>; the deploy workflow sets this.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export", // static HTML/JS in out/, which GitHub Pages can host
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // hide the floating "N" dev badge; compile/runtime errors still show
  devIndicators: false,
};

export default nextConfig;

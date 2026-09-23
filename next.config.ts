import type { NextConfig } from "next";

// When GITHUB_PAGES=true (set by the deploy workflow), build for static export
// with basePath=/DemoAppDataSci so the site is served from
// https://testdemoqwenai2025-creator.github.io/DemoAppDataSci/
// In dev mode (no env var), the dev server runs at / with no basePath.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = "DemoAppDataSci";

const nextConfig: NextConfig = {
  // In dev: standalone (server runtime). On GitHub Pages build: export (static).
  output: isGitHubPages ? "export" : "standalone",
  // basePath only when building for GitHub Pages
  basePath: isGitHubPages ? `/${repoName}` : "",
  // Static export can't optimise images
  images: isGitHubPages ? { unoptimized: true } : undefined,
  // Append trailing slash so all routes resolve on GitHub Pages static hosting
  trailingSlash: isGitHubPages ? true : false,
  // Don't error on eslint/typescript at build time (we lint separately)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
};

export default nextConfig;

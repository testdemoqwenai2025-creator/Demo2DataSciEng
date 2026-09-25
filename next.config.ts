import type { NextConfig } from "next";

// When GITHUB_PAGES=true (set by the deploy workflow), build for static export
// with basePath=/Demo2DataSciEng so the site is served from
// https://testdemoqwenai2025-creator.github.io/Demo2DataSciEng/
// In dev mode (no env var), the dev server runs at / with no basePath.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = "Demo2DataSciEng";

const basePath = isGitHubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  // In dev: standalone (server runtime). On GitHub Pages build: export (static).
  output: isGitHubPages ? "export" : "standalone",
  // basePath only when building for GitHub Pages
  basePath: basePath,
  // Expose basePath to client-side code so <img> tags can prefix their src
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // Static export can't optimise images
  images: isGitHubPages ? { unoptimized: true } : undefined,
  // Append trailing slash so all routes resolve on GitHub Pages static hosting
  trailingSlash: isGitHubPages ? true : false,
  // Don't error on eslint/typescript at build time (we lint separately)
  typescript: { ignoreBuildErrors: true },
  // (eslint config option removed — Next.js 16 doesn't support it here;
  //  eslint runs as its own script via `bun run lint`)
  reactStrictMode: false,
};

export default nextConfig;

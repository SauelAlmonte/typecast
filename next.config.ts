import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // TMDB art loads straight from TMDB's CDN; see the loader file.
    loader: "custom",
    loaderFile: "./src/lib/tmdb-image-loader.ts",
  },
  // The full prerender makes one TMDB call per detail page. These caps
  // work with tmdb.ts's per-process semaphore (2) to hold global TMDB
  // concurrency near workers × 2, under TMDB's ~50 req/s ceiling:
  // fewer, fuller workers instead of one per CPU, and a page-level
  // retry above the fetch-level one before the build fails.
  experimental: {
    staticGenerationRetryCount: 2,
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 500,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // TMDB art loads straight from TMDB's CDN; see the loader file.
    loader: "custom",
    loaderFile: "./src/lib/tmdb-image-loader.ts",
  },
};

export default nextConfig;

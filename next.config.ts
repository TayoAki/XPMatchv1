import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Railway image small; PGlite ships WASM that must not be bundled.
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite"],
  // A second dev instance (the end-to-end restart test) needs its own build directory.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // The demo recording (demo/capture.mjs) runs against `next dev` and keeps the dev badge out of the video.
  ...(process.env.NEXT_DEV_INDICATORS === "0" ? { devIndicators: false as const } : {}),
};

export default nextConfig;

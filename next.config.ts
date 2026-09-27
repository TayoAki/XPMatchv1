import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Railway image small; PGlite ships WASM that must not be bundled.
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite"],
  // A second dev instance (the end-to-end restart test) needs its own build directory.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // The demo recording (demo/capture.mjs) runs against `next dev` and keeps the dev badge out of the video.
  ...(process.env.NEXT_DEV_INDICATORS === "0" ? { devIndicators: false as const } : {}),
  // Explore is off for now; old links and bookmarks land on Discover. Temporary (307), so browsers
  // do not cache it and the page can come back at the same address.
  redirects: async () => [{ source: "/explore", destination: "/", permanent: false }],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Railway image small; PGlite ships WASM that must not be bundled.
  output: "standalone",
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;

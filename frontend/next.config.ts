import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The Docker image runs `.next/standalone/server.js`. On Vercel that output
  // reads `.next/next-server.js.nft.json` and the build fails with ENOENT.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;

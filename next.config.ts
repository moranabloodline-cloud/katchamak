import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* bez Next devtools dugmeta (N) u uglu — čist izgled po Nikolinoj odluci */
  devIndicators: false,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;

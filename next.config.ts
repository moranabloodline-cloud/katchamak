import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: (process.env.KATCHAMAK_SITES_EXPORT === "1" || process.env.KATCHAMAK_DESKTOP === "1") ? "export" : "standalone",
  /* bez Next devtools dugmeta (N) u uglu — čist izgled po Nikolinoj odluci */
  devIndicators: false,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;

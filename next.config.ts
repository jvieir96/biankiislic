import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  basePath: "/biankiislic",
  assetPrefix: "/biankiislic/",
  images: {
    unoptimized: true
  }
};

export default nextConfig;

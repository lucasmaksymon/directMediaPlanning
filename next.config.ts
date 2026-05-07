import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["leaflet", "react-leaflet"],
};

export default nextConfig;

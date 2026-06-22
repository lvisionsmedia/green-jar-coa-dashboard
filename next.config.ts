import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mupdf"],
  outputFileTracingIncludes: {
    "/api/coas": ["./node_modules/mupdf/dist/mupdf-wasm.wasm"],
  },
};

export default nextConfig;

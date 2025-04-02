import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack-specific configurations
  experimental: {
    turbo: {
      // Optional: Configure rules for Turbopack
      // loaders: {},
      // resolveAlias: {},
    }
  },
  
  // Existing config options can remain the same
  // For example:
  // reactStrictMode: true,
  // images: { ... },
  // webpack: (config, { isServer }) => { ... }
};

export default nextConfig;

// Note: Some webpack-specific configurations might not work directly with Turbopack
// You may need to find Turbopack-equivalent alternatives for complex webpack configs
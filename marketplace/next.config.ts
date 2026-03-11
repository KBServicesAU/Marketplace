import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow product images from any supplier domain.
    // Images are re-uploaded to Supabase Storage during import, but we
    // fall back to the original supplier URL if the upload fails.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;

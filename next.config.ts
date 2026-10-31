import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Automated builds use their own folder (NEXT_DIST_DIR) so they never overwrite a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Lets the dev server be opened by IP (127.0.0.1, or a phone on the same Wi-Fi) without dead buttons.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    // Every image is served by Cloudinary through its own loader (components/ui/photo.tsx), not by this optimiser.
    // This entry only keeps old Supabase Storage addresses working (for example in a returning customer's saved bag).
    // Remove it once the Supabase buckets have been deleted.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

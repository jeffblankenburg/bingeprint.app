import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    // TMDB artwork (posters/backdrops/stills/profiles) is served from here.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
  async rewrites() {
    // Reverse-proxy PostHog through our own domain under a non-obvious path so
    // analytics survives ad/tracker blockers. Kept separate from proxy.ts.
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
      { source: "/ingest/decide", destination: "https://us.i.posthog.com/decide" },
    ];
  },
  // PostHog uses trailing-slash-sensitive endpoints; keep this off.
  skipTrailingSlashRedirect: true,
};

// Serwist injects a webpack config to build the service worker. Next 16 defaults
// to Turbopack for `next dev`, which Serwist doesn't support — so we only invoke
// it for production builds (run with `next build --webpack`). Dev stays on
// Turbopack with the SW off, and Serwist's init (and its warning) never runs.
export default isDev
  ? nextConfig
  : withSerwistInit({
      swSrc: "app/sw.ts",
      swDest: "public/sw.js",
      reloadOnOnline: true,
    })(nextConfig);

import type { Metadata, Viewport } from "next";
// Bundled, self-hosted fonts (no build-time network fetch — Turbopack-safe).
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { AnalyticsProvider } from "@/lib/analytics/provider";

// GeistSans/GeistMono expose `--font-geist-sans` / `--font-geist-mono` via their
// `.variable` class; Space Grotesk is wired via CSS (see globals.css @theme).

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bingeprint — Your television, decoded",
    template: "%s · Bingeprint",
  },
  description:
    "Bingeprint learns what you watch, what you love, and what you'll enjoy next. Your permanent record of television — and the smartest answer to \"what should I watch next?\"",
  applicationName: "Bingeprint",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bingeprint",
  },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Bingeprint",
    title: "Bingeprint — Your television, decoded",
    description:
      "Track what you watch. Discover what's next. Bingeprint knows your television taste better than any streaming service.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark h-full ${GeistSans.variable} ${GeistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}

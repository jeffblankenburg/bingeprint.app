import { headers } from "next/headers";

/**
 * Resolves the current request's origin (protocol + host) from headers, so
 * email redirect links point back to whatever host/port the app is actually
 * served on (localhost:3010 in dev, the Vercel preview URL, or production).
 * Falls back to NEXT_PUBLIC_SITE_URL.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

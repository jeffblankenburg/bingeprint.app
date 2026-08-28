import type { NextRequest } from "next/server";

/**
 * Authorizes a cron/route request. Vercel Cron sends the CRON_SECRET as a Bearer
 * token automatically; we also accept `?secret=` for manual/local triggering.
 * If no CRON_SECRET is configured (local dev), access is allowed.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

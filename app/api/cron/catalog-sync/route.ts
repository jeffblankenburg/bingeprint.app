import { NextResponse, type NextRequest } from "next/server";
import { syncCatalog, syncStreamingProviders } from "@/lib/tv/catalog";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily catalog skeleton sync. Downloads the TMDB TV export and upserts a
 * lightweight row for every series (id, name, popularity, adult). Detail is
 * still fetched on demand by importShow.
 *
 * Scheduled via vercel.json; can be triggered manually with ?secret=<CRON_SECRET>
 * (and ?limit=<n> for a small test run).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;

  const startedAt = Date.now();
  try {
    const [result, providers] = await Promise.all([
      syncCatalog({ limit }),
      syncStreamingProviders("US").catch(() => 0),
    ]);
    return NextResponse.json({
      ok: true,
      ...result,
      providers,
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "catalog sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

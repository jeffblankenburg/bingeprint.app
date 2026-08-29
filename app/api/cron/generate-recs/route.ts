import { NextResponse, type NextRequest } from "next/server";
import { generateRecommendations } from "@/lib/recommendations/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Regenerate recommendations. Recs also generate lazily on dashboard view; this
 * keeps them fresh in the background. GET /api/cron/generate-recs[?user=<id>]
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const user = request.nextUrl.searchParams.get("user");

  if (user) {
    const recs = await generateRecommendations(user);
    return NextResponse.json({ ok: true, user, recs });
  }

  const { data } = await admin.from("profiles").select("id").limit(100);
  let total = 0;
  for (const p of data ?? []) {
    total += await generateRecommendations(p.id);
  }
  return NextResponse.json({ ok: true, users: (data ?? []).length, total });
}

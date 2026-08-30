import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/tv/provider";

export const dynamic = "force-dynamic";

/** Live search endpoint for the debounced client search box. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ shows: [], people: [] });

  const provider = getProvider();
  try {
    const { shows, people } = await provider.searchMulti(q);
    return NextResponse.json({
      shows: shows.slice(0, 20).map((s) => ({
        tmdbId: Number(s.providerId),
        name: s.name,
        overview: s.overview,
        year: s.firstAirDate?.slice(0, 4) ?? "",
        poster: provider.imageUrl(s.posterPath, "thumb"),
      })),
      people: people.slice(0, 6).map((p) => ({
        tmdbId: Number(p.providerId),
        name: p.name,
        department: p.department,
        profile: provider.imageUrl(p.profilePath, "thumb"),
      })),
    });
  } catch {
    return NextResponse.json({ shows: [], people: [] }, { status: 200 });
  }
}

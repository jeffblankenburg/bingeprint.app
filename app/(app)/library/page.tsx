import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LibraryView, type LibraryItem } from "@/components/library/library-view";
import { SmpteBars } from "@/components/brand/smpte-bars";
import type { ShowStatus } from "@/lib/analytics/events";

export const metadata: Metadata = { title: "Library" };

type Row = {
  status: ShowStatus;
  added_at: string;
  shows: {
    id: string;
    tmdb_id: number;
    name: string;
    poster_path: string | null;
    first_air_date: string | null;
    last_air_date: string | null;
    number_of_episodes: number | null;
  } | null;
};

export default async function LibraryPage() {
  const { user, supabase } = await requireUser();

  const { data } = await supabase
    .from("user_shows")
    .select(
      "status, added_at, shows(id, tmdb_id, name, poster_path, first_air_date, last_air_date, number_of_episodes)",
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const rows = (data ?? []) as Row[];
  const items: LibraryItem[] = rows
    .filter((r) => r.shows)
    .map((r) => ({
      id: r.shows!.id,
      tmdb_id: r.shows!.tmdb_id,
      name: r.shows!.name,
      poster_path: r.shows!.poster_path,
      year: r.shows!.first_air_date?.slice(0, 4) ?? null,
      episodes: r.shows!.number_of_episodes,
      status: r.status,
      added_at: r.added_at,
      last_air: r.shows!.last_air_date,
    }));

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Your shows
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Library</h1>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "show" : "shows"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your library is empty. Find a show and add it.
            </p>
            <Link
              href="/search"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Search shows
            </Link>
          </div>
        </div>
      ) : (
        <LibraryView items={items} />
      )}
    </div>
  );
}

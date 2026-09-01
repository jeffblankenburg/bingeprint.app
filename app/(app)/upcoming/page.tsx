import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUpcoming, type UpcomingBucket, type UpcomingEpisode } from "@/lib/upcoming";
import { formatAirDate } from "@/lib/time";
import { SmpteBars } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Upcoming" };

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

const SECTIONS: { key: UpcomingBucket; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "later", label: "Coming Soon" },
];

const fmtDate = (iso: string) => formatAirDate(iso);

function epCode(s: number, e: number) {
  return `S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}`;
}

function Row({ ep }: { ep: UpcomingEpisode }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Link href={`/show/${ep.show.tmdb_id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-[68px] w-[46px] shrink-0 overflow-hidden rounded bg-secondary">
          {ep.show.poster_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${TMDB_IMAGE}/w92${ep.show.poster_path}`}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <SmpteBars height="100%" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {ep.show.name}
            {ep.isPremiere && (
              <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {ep.season_number === 1 ? "Series Premiere" : "Season Premiere"}
              </span>
            )}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {epCode(ep.season_number, ep.episode_number)}
            {ep.name ? ` · ${ep.name}` : ""}
          </p>
        </div>
      </Link>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {fmtDate(ep.air_date)}
      </span>
    </li>
  );
}

export default async function UpcomingPage() {
  const { user, profile, supabase } = await requireUser();
  const { groups, total } = await getUpcoming(supabase, user.id, profile?.timezone ?? undefined);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          On the horizon
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Upcoming</h1>
      </div>

      {total === 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing scheduled for the shows you follow. Track a returning series
              and its next episodes will show up here.
            </p>
            <Link
              href="/search"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Find a show
            </Link>
          </div>
        </div>
      ) : (
        SECTIONS.filter((s) => groups[s.key].length > 0).map((s) => (
          <section key={s.key} className="space-y-3">
            <h2 className="font-display text-lg font-semibold">
              {s.label}
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {groups[s.key].length}
              </span>
            </h2>
            <ul className="divide-y rounded-xl border bg-card">
              {groups[s.key].map((ep) => (
                <Row key={ep.id} ep={ep} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

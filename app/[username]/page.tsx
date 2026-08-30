import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/profile/public";
import { isReservedUsername } from "@/lib/username";
import { AppHeader } from "@/components/app/app-header";
import { BottomTabs } from "@/components/app/nav";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { LazyImage } from "@/components/ui/lazy-image";

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

function normalize(raw: string): string | null {
  const name = decodeURIComponent(raw).toLowerCase();
  if (!USERNAME_RE.test(name) || isReservedUsername(name)) return null;
  return name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const name = normalize(username);
  if (!name) return { title: "Profile not found" };
  const data = await getPublicProfile(name);
  if (!data) return { title: "Profile not found", robots: { index: false } };
  const who = data.profile.display_name ?? `@${data.profile.username}`;
  return {
    title: `${who} on Bingeprint`,
    description: `${who}'s Bingeprint — ${data.stats.episodes_watched.toLocaleString()} episodes watched across ${data.stats.shows_tracked} shows.`,
    openGraph: {
      title: `${who} on Bingeprint`,
      description: `${data.stats.episodes_watched.toLocaleString()} episodes · ${data.stats.shows_completed} shows completed`,
    },
  };
}

function fmtMember(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const name = normalize(username);
  if (!name) notFound();

  const data = await getPublicProfile(name);
  if (!data) notFound();

  const user = await getOptionalUser();
  const who = data.profile.display_name ?? `@${data.profile.username}`;
  const initial = (data.profile.display_name ?? data.profile.username).charAt(0).toUpperCase();

  const stats = [
    { label: "Episodes watched", value: data.stats.episodes_watched },
    { label: "Shows tracked", value: data.stats.shows_tracked },
    { label: "Shows completed", value: data.stats.shows_completed },
  ];

  return (
    <>
      <AppHeader />
      <main className="pb-bottom-nav relative min-h-dvh">
        <SmpteBars height="5px" />
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {/* Identity */}
          <header className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary">
              {data.profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-muted-foreground">
                  {initial}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight">
                {who}
              </h1>
              <p className="font-mono text-xs text-muted-foreground">
                @{data.profile.username} · since {fmtMember(data.profile.created_at)}
              </p>
            </div>
          </header>

          {data.profile.bio && (
            <p className="mt-4 text-sm text-muted-foreground">{data.profile.bio}</p>
          )}

          {/* Stats */}
          <section className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <p className="tabular font-mono text-2xl font-bold">
                  {s.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Top genres */}
          {data.top_genres.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Signature genres
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.top_genres.map((g) => (
                  <span
                    key={g.name}
                    className="rounded-full border bg-card px-3 py-1 text-sm"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Favorites */}
          {data.favorites.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Favorites
              </h2>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {data.favorites.map((show) => (
                  <li key={show.tmdb_id}>
                    <Link href={`/show/${show.tmdb_id}`} className="group block">
                      <div className="aspect-[2/3] overflow-hidden rounded-lg border bg-secondary">
                        {show.poster_path ? (
                          <LazyImage
                            src={`${TMDB_IMAGE}/w342${show.poster_path}`}
                            alt={show.name}
                          />
                        ) : (
                          <SmpteBars height="100%" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-tight text-muted-foreground group-hover:text-foreground">
                        {show.name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.favorites.length === 0 && data.top_genres.length === 0 && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {who} hasn&rsquo;t shared any favorites yet.
            </p>
          )}
        </div>
      </main>
      {user && <BottomTabs />}
    </>
  );
}

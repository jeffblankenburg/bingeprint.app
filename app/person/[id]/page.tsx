import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonDetail } from "@/lib/tv/read";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app/app-header";
import { BottomTabs } from "@/components/app/nav";
import { LazyImage } from "@/components/ui/lazy-image";
import { SmpteBars } from "@/components/brand/smpte-bars";

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const person = await getPersonDetail(Number(id));
  if (!person) return { title: "Person not found" };
  return {
    title: person.name,
    description: person.biography?.slice(0, 160) ?? `${person.name} on Bingeprint`,
  };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPersonDetail(Number(id));
  if (!person) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 md:pb-16">
        {/* Profile */}
        <div className="flex gap-4">
          <div className="aspect-[2/3] w-24 shrink-0 self-start overflow-hidden rounded-lg border bg-secondary shadow-lg sm:w-32">
            {person.profilePath ? (
              <LazyImage
                src={`${TMDB_IMAGE}/w342${person.profilePath}`}
                alt={person.name}
                eager
              />
            ) : (
              <SmpteBars height="100%" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              {person.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
              {person.department && <span>{person.department}</span>}
              {person.birthday && <span>· b. {person.birthday}</span>}
            </div>
          </div>
        </div>

        {person.biography && (
          <p className="mt-5 line-clamp-6 text-sm leading-relaxed text-muted-foreground">
            {person.biography}
          </p>
        )}

        {/* Filmography */}
        <section className="mt-8 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Filmography · {person.credits.length} shows
          </h2>
          {person.credits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No TV credits found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {person.credits.map((credit) => (
                <Link
                  key={credit.show.providerId}
                  href={`/show/${credit.show.providerId}`}
                  className="group"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border bg-secondary">
                    {credit.show.posterPath ? (
                      <LazyImage
                        src={`${TMDB_IMAGE}/w185${credit.show.posterPath}`}
                        alt={credit.show.name}
                      />
                    ) : (
                      <SmpteBars height="100%" />
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight">
                    {credit.show.name}
                  </p>
                  {(credit.character || credit.role === "creator") && (
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                      {credit.role === "creator" ? "Creator" : credit.character}
                      {credit.episodeCount ? ` · ${credit.episodeCount} eps` : ""}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <p className="mt-10 text-center font-mono text-[10px] text-muted-foreground">
          Metadata from TMDB
        </p>
      </main>
      {user && <BottomTabs />}
    </>
  );
}

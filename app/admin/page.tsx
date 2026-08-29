import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTools } from "@/components/admin/admin-tools";
import { Logo } from "@/components/brand/logo";
import { SmpteBars } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
export const maxDuration = 300; // room for the on-demand catalog sync action

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const head = { count: "exact" as const, head: true };
  const [usersR, showsR, detailedR, trackedR, watchedR, recent] = await Promise.all([
    admin.from("profiles").select("*", head),
    admin.from("shows").select("*", head),
    admin.from("shows").select("*", head).not("details_synced_at", "is", null),
    admin.from("user_shows").select("*", head),
    admin.from("user_episodes").select("*", head),
    admin
      .from("profiles")
      .select("display_name, username, created_at, is_admin")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: "Users", value: usersR.count ?? 0 },
    { label: "Shows (catalog)", value: showsR.count ?? 0 },
    { label: "Shows (detailed)", value: detailedR.count ?? 0 },
    { label: "Tracked shows", value: trackedR.count ?? 0 },
    { label: "Episodes watched", value: watchedR.count ?? 0 },
  ];

  return (
    <main className="pt-safe min-h-dvh">
      <SmpteBars height="6px" />
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Admin
            </span>
          </div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← App
          </Link>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <p className="tabular font-mono text-2xl font-bold">
                {s.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">Tools</h2>
          <AdminTools />
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Recent signups</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {(recent.data ?? []).length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No users yet.</li>
            )}
            {(recent.data ?? []).map((p, i) => (
              <li key={i} className="flex items-center justify-between p-3 text-sm">
                <span>
                  {p.display_name ?? "—"}
                  {p.username && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      @{p.username}
                    </span>
                  )}
                  {p.is_admin && (
                    <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      admin
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {p.created_at?.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

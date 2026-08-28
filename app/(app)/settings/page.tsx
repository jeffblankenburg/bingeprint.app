import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/settings/profile-form";
import { StreamingPicker } from "@/components/settings/streaming-picker";
import { isAdminUser } from "@/lib/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile, supabase } = await requireUser();
  const admin = await isAdminUser(user);

  const [{ data: services }, { data: mine }] = await Promise.all([
    supabase
      .from("streaming_services")
      .select("id, name, logo_path, display_priority")
      .order("display_priority", { ascending: true, nullsFirst: false })
      .limit(32),
    supabase.from("user_streaming_services").select("service_id").eq("user_id", user.id),
  ]);
  const serviceOptions = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    logoPath: s.logo_path,
  }));
  const mySelected = (mine ?? []).map((m) => m.service_id);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Account
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <section className="space-y-4">
        <div className="rounded-md border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="font-mono text-sm">{user.email}</p>
        </div>

        <ProfileForm
          displayName={profile?.display_name ?? ""}
          username={profile?.username ?? ""}
          isPublic={profile?.is_public ?? false}
        />
      </section>

      <section className="space-y-3 border-t pt-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Your streaming services</h2>
          <p className="text-sm text-muted-foreground">
            Pick what you subscribe to. We&rsquo;ll only recommend shows you can
            actually watch — you can still track or favorite anything.
          </p>
        </div>
        {serviceOptions.length > 0 ? (
          <StreamingPicker services={serviceOptions} initialSelected={mySelected} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Service list is still populating — check back shortly.
          </p>
        )}
      </section>

      {admin && (
        <section className="border-t pt-6">
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
          >
            Open admin dashboard →
          </Link>
        </section>
      )}
    </div>
  );
}

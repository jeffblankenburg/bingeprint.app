import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/settings/profile-form";
import { isAdminUser } from "@/lib/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await requireUser();
  const admin = await isAdminUser(user);

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

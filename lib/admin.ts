import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Bootstrapping allowlist — emails here are admins even without the DB flag. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True if the user is an admin (env allowlist or profiles.is_admin). */
export async function isAdminUser(user: User): Promise<boolean> {
  if (user.email && adminEmails().includes(user.email.toLowerCase())) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return !!data?.is_admin;
}

/** Guard for admin routes: requires a session AND admin rights. */
export async function requireAdmin(): Promise<{ user: User }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await isAdminUser(user))) redirect("/dashboard");
  return { user };
}

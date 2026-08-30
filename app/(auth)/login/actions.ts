"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/site-url";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";

const emailSchema = z.string().trim().toLowerCase().email();
const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export type LoginState = {
  ok: boolean;
  email?: string;
  error?: string;
  sent?: boolean;
};

/**
 * Step 1 — send a passwordless login email. The email contains BOTH a magic
 * link (→ /auth/callback) and, if the project's email template includes the
 * token, a 6-digit code the user can type instead.
 */
export async function sendLoginCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const email = parsed.data;

  const supabase = await createClient();
  const origin = await getOrigin();
  const next = String(formData.get("next") ?? "/discover");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { ok: false, email, error: error.message };
  }

  await trackServer("signup_started", email, { method: "magic_link" });
  await flushServerAnalytics();

  return { ok: true, email, sent: true };
}

/**
 * Step 2 — verify the 6-digit code the user typed. On success the session
 * cookie is set and we route into the app.
 */
export async function verifyLoginCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const token = otpSchema.safeParse(formData.get("token"));
  if (!email.success) return { ok: false, error: "Something went wrong — start over." };
  if (!token.success) {
    return { ok: false, email: email.data, sent: true, error: token.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: token.data,
    type: "email",
  });

  if (error || !data.user) {
    return { ok: false, email: email.data, sent: true, error: error?.message ?? "Invalid or expired code." };
  }

  const isNew =
    Date.now() - new Date(data.user.created_at).getTime() < 60_000;
  await trackServer("auth_completed", data.user.id, {
    method: "otp",
    is_new_user: isNew,
  });
  await flushServerAnalytics();

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();
  const next = String(formData.get("next") ?? "/discover");
  redirect(profile?.onboarded_at ? next : "/onboarding");
}

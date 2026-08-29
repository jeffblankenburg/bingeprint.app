"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { validateUsername } from "@/lib/username";

export type ProfileState = { ok: boolean; error?: string; saved?: boolean };

/** Update the current user's display name, username, and public flag. */
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { user, supabase } = await requireUser();

  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const isPublic = formData.get("is_public") === "on";

  const patch: {
    display_name: string | null;
    username: string | null;
    is_public: boolean;
  } = {
    display_name: displayName || null,
    username: null,
    is_public: isPublic,
  };

  if (usernameRaw) {
    const check = validateUsername(usernameRaw);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
    patch.username = check.value;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is already taken." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  return { ok: true, saved: true };
}

/**
 * Replace the user's set of subscribed streaming services. Used to gate
 * recommendations to shows they can actually watch (never gates tracking).
 */
export async function setStreamingServices(
  serviceIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const { user, supabase } = await requireUser();

  const { error: delErr } = await supabase
    .from("user_streaming_services")
    .delete()
    .eq("user_id", user.id);
  if (delErr) return { ok: false, error: delErr.message };

  if (serviceIds.length > 0) {
    const { error } = await supabase
      .from("user_streaming_services")
      .insert(serviceIds.map((id) => ({ user_id: user.id, service_id: id })));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}


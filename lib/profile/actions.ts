"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/);

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
    const parsed = usernameSchema.safeParse(usernameRaw);
    if (!parsed.success) {
      return { ok: false, error: "Username must be 3–30 chars: a–z, 0–9, or _" };
    }
    patch.username = parsed.data;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is already taken." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true, saved: true };
}

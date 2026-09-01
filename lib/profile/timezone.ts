"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

/**
 * Persist the user's timezone (an IANA zone like "America/New_York"), normally
 * auto-detected from their device. Validated so only real zones are stored.
 */
export async function saveTimezone(tz: string): Promise<{ ok: boolean }> {
  if (!tz || typeof tz !== "string" || tz.length > 64) return { ok: false };
  try {
    // Throws for an unknown zone.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { ok: false };
  }

  const { user, supabase } = await requireUser();
  const { error } = await supabase.from("profiles").update({ timezone: tz }).eq("id", user.id);
  if (error) return { ok: false };

  // Release-date views depend on the zone.
  revalidatePath("/dashboard");
  revalidatePath("/upcoming");
  return { ok: true };
}

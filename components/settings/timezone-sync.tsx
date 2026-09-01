"use client";

import { useEffect, useRef } from "react";
import { saveTimezone } from "@/lib/profile/timezone";

/**
 * Keeps the stored timezone in step with the device. Runs once on mount: if the
 * browser's IANA zone differs from what's stored, persist it — so release dates
 * resolve in the user's actual local day with zero setup. Mounted app-wide.
 */
export function TimezoneSync({ current }: { current: string | null }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== current) void saveTimezone(tz);
    } catch {
      // Intl unavailable — keep the stored/default zone.
    }
  }, [current]);

  return null;
}

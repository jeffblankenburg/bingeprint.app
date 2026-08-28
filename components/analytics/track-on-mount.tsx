"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import type { AnalyticsEvent, PropsFor } from "@/lib/analytics";

/**
 * Fires a single analytics event when the component mounts. Drop into a Server
 * Component page to instrument a view without making the whole page a client
 * component.
 */
export function TrackOnMount<E extends AnalyticsEvent>({
  event,
  props,
}: {
  event: E;
  props?: PropsFor<E>;
}) {
  useEffect(() => {
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

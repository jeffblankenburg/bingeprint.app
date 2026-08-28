/**
 * Client-safe analytics dispatcher.
 *
 * The app calls `track(event, props)` from client code. It fans the event out to
 * every configured browser provider (PostHog + Vercel Analytics). Providers are
 * optional: a missing key is a silent no-op.
 *
 * SERVER code must import from "@/lib/analytics/server" instead — that module
 * pulls in posthog-node (a Node-only lib) which must never enter the client
 * bundle. Keeping it out of this file is what makes the client build succeed.
 */

import type { AnalyticsEvent, PropsFor } from "./events";

function trackClient<E extends AnalyticsEvent>(event: E, props?: PropsFor<E>) {
  import("posthog-js")
    .then(({ default: posthog }) => {
      if (posthog.__loaded) posthog.capture(event, props as Record<string, unknown>);
    })
    .catch(() => {});

  import("@vercel/analytics")
    .then(({ track: vercelTrack }) => {
      vercelTrack(event, sanitizeForVercel(props as Record<string, unknown> | undefined));
    })
    .catch(() => {});
}

/** Vercel `track` only accepts flat string | number | boolean | null values. */
function sanitizeForVercel(
  props?: Record<string, unknown>,
): Record<string, string | number | boolean | null> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
      out[k] = v as string | number | boolean | null;
    }
  }
  return out;
}

/** Fire-and-forget analytics from client code. No-op on the server. */
export function track<E extends AnalyticsEvent>(event: E, props?: PropsFor<E>) {
  if (typeof window === "undefined") return;
  try {
    trackClient(event, props);
  } catch {
    // Analytics must never break the product.
  }
}

export { ANALYTICS_EVENTS } from "./events";
export type { AnalyticsEvent, PropsFor, EventPropertyMap } from "./events";

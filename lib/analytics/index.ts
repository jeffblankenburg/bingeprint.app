/**
 * Central analytics dispatcher.
 *
 * The whole app calls `track(event, props)`. This module fans the event out to
 * every configured provider (PostHog for product analytics, Vercel Analytics
 * for custom events). Providers are optional: if a key is missing the call is a
 * silent no-op, so local dev and previews never crash on analytics.
 *
 * Works on both client and server:
 *   - Client: posthog-js (+ Vercel `track`)
 *   - Server: posthog-node (call `trackServer` / `flushServerAnalytics`)
 */

import type { AnalyticsEvent, PropsFor } from './events';

const isServer = typeof window === 'undefined';

// ── Client dispatch ─────────────────────────────────────────────────────────

function trackClient<E extends AnalyticsEvent>(event: E, props?: PropsFor<E>) {
  // PostHog (browser) — loaded lazily so it never blocks first paint.
  import('posthog-js')
    .then(({ default: posthog }) => {
      if (posthog.__loaded) posthog.capture(event, props as Record<string, unknown>);
    })
    .catch(() => {});

  // Vercel Analytics custom events (client only, string/number/boolean props).
  import('@vercel/analytics')
    .then(({ track: vercelTrack }) => {
      vercelTrack(event, sanitizeForVercel(props));
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
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
      out[k] = v as string | number | boolean | null;
    }
  }
  return out;
}

// ── Server dispatch ─────────────────────────────────────────────────────────

/**
 * Track from a Server Action / Route Handler / cron job. `distinctId` should be
 * the authenticated user id so server + client events stitch into one person.
 * Remember to `await flushServerAnalytics()` in short-lived serverless contexts.
 */
export async function trackServer<E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  props?: PropsFor<E>,
) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const { PostHog } = await import('posthog-node');
  const client = getServerClient(PostHog, key);
  client.capture({
    distinctId,
    event,
    properties: props as Record<string, unknown>,
  });
}

let serverClient: import('posthog-node').PostHog | null = null;
function getServerClient(
  PostHog: typeof import('posthog-node').PostHog,
  key: string,
) {
  if (!serverClient) {
    serverClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return serverClient;
}

/** Flush pending server events before a serverless function exits. */
export async function flushServerAnalytics() {
  if (serverClient) await serverClient.flush();
}

// ── Public entrypoint ───────────────────────────────────────────────────────

/**
 * Fire-and-forget analytics from client code. On the server this is a no-op —
 * use `trackServer` there so events carry the correct distinct id.
 */
export function track<E extends AnalyticsEvent>(event: E, props?: PropsFor<E>) {
  if (isServer) return;
  try {
    trackClient(event, props);
  } catch {
    // Analytics must never break the product.
  }
}

export { ANALYTICS_EVENTS } from './events';
export type { AnalyticsEvent, PropsFor, EventPropertyMap } from './events';

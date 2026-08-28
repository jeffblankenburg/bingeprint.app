import "server-only";

import type { AnalyticsEvent, PropsFor } from "./events";

/**
 * Server-side analytics (Server Actions, Route Handlers, cron jobs). Uses
 * posthog-node, a Node-only library — this module must never be imported from
 * client code. `distinctId` should be the authenticated user id so server and
 * client events stitch into one person.
 */
let serverClient: import("posthog-node").PostHog | null = null;

async function getClient(): Promise<import("posthog-node").PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!serverClient) {
    const { PostHog } = await import("posthog-node");
    serverClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return serverClient;
}

export async function trackServer<E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  props?: PropsFor<E>,
) {
  const client = await getClient();
  if (!client) return;
  client.capture({
    distinctId,
    event,
    properties: props as Record<string, unknown>,
  });
}

/** Flush pending server events before a serverless function exits. */
export async function flushServerAnalytics() {
  if (serverClient) await serverClient.flush();
}

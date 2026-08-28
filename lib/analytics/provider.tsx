'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

/**
 * Wraps the app with product + web analytics providers:
 *   - PostHog (product analytics) — initialized only when a key is present, so
 *     dev/preview builds without a key are a clean no-op.
 *   - Vercel Analytics + Speed Insights (traffic & Core Web Vitals).
 *
 * Manual pageview capture is used because the App Router does not emit full page
 * loads on client navigation.
 */
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false, // captured manually below
    capture_pageleave: true,
    person_profiles: 'identified_only',
    defaults: '2025-05-24',
  });
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const body = (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );

  // Only mount the PostHog context when configured.
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <PHProvider client={posthog}>{body}</PHProvider>;
  }
  return body;
}

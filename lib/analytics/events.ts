/**
 * Central typed analytics event catalog.
 *
 * Every product event in Bingeprint is defined here exactly once. The rest of
 * the app calls `track(event, props)` (see ./index) and never talks to a
 * provider (PostHog / Vercel) directly. Swapping or adding providers later is a
 * change in one file, not a rewrite across the product.
 *
 * Privacy: event payloads must NEVER contain private viewing history in a form
 * that identifies content the user has hidden. Prefer stable IDs over titles,
 * and never attach raw notes/ratings text.
 */

export const ANALYTICS_EVENTS = {
  // ── Acquisition ────────────────────────────────────────────────────────────
  landing_page_viewed: 'landing_page_viewed',
  signup_started: 'signup_started',
  signup_completed: 'signup_completed',
  auth_completed: 'auth_completed',

  // ── Onboarding ─────────────────────────────────────────────────────────────
  onboarding_started: 'onboarding_started',
  onboarding_show_presented: 'onboarding_show_presented',
  onboarding_show_rated: 'onboarding_show_rated',
  onboarding_show_skipped: 'onboarding_show_skipped',
  onboarding_completed: 'onboarding_completed',

  // ── Engagement ─────────────────────────────────────────────────────────────
  show_searched: 'show_searched',
  show_viewed: 'show_viewed',
  show_added: 'show_added',
  show_status_changed: 'show_status_changed',
  episode_marked_watched: 'episode_marked_watched',
  episode_unmarked_watched: 'episode_unmarked_watched',
  season_marked_watched: 'season_marked_watched',
  show_marked_all_watched: 'show_marked_all_watched',
  show_completed: 'show_completed',
  rating_added: 'rating_added',

  // ── Discovery ──────────────────────────────────────────────────────────────
  recommendation_viewed: 'recommendation_viewed',
  recommendation_clicked: 'recommendation_clicked',
  recommendation_accepted: 'recommendation_accepted',
  recommendation_dismissed: 'recommendation_dismissed',
  recommendation_added_to_watchlist: 'recommendation_added_to_watchlist',

  // ── Retention ──────────────────────────────────────────────────────────────
  session_started: 'session_started',
  return_visit: 'return_visit',

  // ── Notifications ──────────────────────────────────────────────────────────
  notification_generated: 'notification_generated',
  notification_delivered: 'notification_delivered',
  notification_opened: 'notification_opened',
  show_opened_from_notification: 'show_opened_from_notification',
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ── Shared property shapes ─────────────────────────────────────────────────
export type ShowStatus =
  | 'want_to_watch'
  | 'watching'
  | 'watched'
  | 'paused'
  | 'abandoned';

export type Reaction = 'loved' | 'liked' | 'not_for_me';

export type RecommendationFeedback =
  | 'interested'
  | 'not_interested'
  | 'already_watched'
  | 'not_my_thing';

/**
 * Strongly-typed properties for each event. `track()` enforces this mapping so
 * a miswired property is a compile error, not a silently-dropped field.
 */
export interface EventPropertyMap {
  landing_page_viewed: { referrer?: string; utm_source?: string };
  signup_started: { method: 'magic_link' | 'otp' };
  signup_completed: { method: 'magic_link' | 'otp' };
  auth_completed: { method: 'magic_link' | 'otp'; is_new_user: boolean };

  onboarding_started: Record<string, never>;
  onboarding_show_presented: { show_id: string; position: number };
  onboarding_show_rated: { show_id: string; reaction: Reaction };
  onboarding_show_skipped: { show_id: string };
  onboarding_completed: { rated_count: number };

  show_searched: { query_length: number; result_count: number; kind?: string };
  show_viewed: { show_id: string; source?: string };
  show_added: { show_id: string; status: ShowStatus; source?: string };
  show_status_changed: { show_id: string; from: ShowStatus; to: ShowStatus };
  episode_marked_watched: { show_id: string; episode_id: string };
  episode_unmarked_watched: { show_id: string; episode_id: string };
  season_marked_watched: { show_id: string; season_id: string; episode_count: number };
  show_marked_all_watched: { show_id: string; episode_count: number };
  show_completed: { show_id: string; episode_count: number };
  rating_added: { show_id: string; rating?: number; reaction?: Reaction };

  recommendation_viewed: { show_id: string; collection: string; score: number };
  recommendation_clicked: { show_id: string; collection: string };
  recommendation_accepted: { show_id: string; collection: string };
  recommendation_dismissed: { show_id: string; collection: string; feedback: RecommendationFeedback };
  recommendation_added_to_watchlist: { show_id: string; collection: string };

  session_started: { is_pwa?: boolean };
  return_visit: { days_since_last?: number };

  notification_generated: { kind: string; show_id: string };
  notification_delivered: { kind: string; show_id: string; channel: string };
  notification_opened: { kind: string; show_id: string; channel: string };
  show_opened_from_notification: { kind: string; show_id: string };
}

export type PropsFor<E extends AnalyticsEvent> = E extends keyof EventPropertyMap
  ? EventPropertyMap[E]
  : Record<string, unknown>;

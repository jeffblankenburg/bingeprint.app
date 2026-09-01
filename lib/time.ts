/**
 * Release-date logic runs in a single app timezone. TMDB air dates are calendar
 * dates with no time, and every current user is in US Eastern — so "has it
 * aired?" must be answered against the Eastern calendar day. Answering it in UTC
 * (as `new Date().toISOString()` does) rolls the date over 4–5 hours early and
 * makes episodes look available the night before they actually are.
 *
 * When we later support per-user timezones, thread the user's zone through these
 * helpers instead of the default.
 */
export const APP_TIMEZONE = "America/New_York";

/** Today's calendar date (YYYY-MM-DD) in the app timezone. */
export function todayISO(tz: string = APP_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** A calendar date `days` from today (YYYY-MM-DD) in the app timezone. */
export function dateOffsetISO(days: number, tz: string = APP_TIMEZONE): string {
  const d = new Date(`${todayISO(tz)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whether a date-only air date has arrived in the app timezone (inclusive). */
export function hasAired(airDate: string | null | undefined, tz: string = APP_TIMEZONE): boolean {
  return !!airDate && airDate <= todayISO(tz);
}

/**
 * Format a date-only string for display without timezone drift. A bare
 * `new Date("2026-08-31")` parses as UTC midnight and renders as Aug 30 in
 * Eastern; anchoring to noon UTC and formatting in UTC keeps the calendar date
 * stable.
 */
export function formatAirDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

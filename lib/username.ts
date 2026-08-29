/**
 * Username rules — shared by profile updates (claim time) and the future public
 * `/[username]` route. Because profiles live at the site root (bingeprint.app/
 * jeff), usernames must never collide with current OR future top-level routes,
 * and must not enable impersonation.
 */

// Reserved: current + plausible-future routes, brand/role terms, infra, legal,
// and a starter abuse list. Reserve future-feature words proactively so a
// squatter can't block a route we haven't built yet.
const RESERVED = new Set<string>([
  // ── current + future top-level routes ──
  "login", "logout", "signin", "sign-in", "signout", "signup", "sign-up", "register",
  "auth", "callback", "verify", "onboarding", "welcome",
  "dashboard", "home", "search", "show", "shows", "series", "person", "people",
  "actor", "actors", "cast", "creator", "creators", "library", "watchlist",
  "upcoming", "calendar", "insights", "stats", "bingeprint", "profile", "profiles",
  "account", "accounts", "settings", "preferences", "admin", "administrator",
  "api", "graphql", "oauth", "webhook", "webhooks", "rss", "feed", "feeds",
  "sitemap", "robots", "manifest", "sw", "favicon", "ingest",
  "discover", "explore", "trending", "popular", "new", "browse", "watch",
  "lists", "list", "collection", "collections", "genre", "genres", "network",
  "networks", "groups", "group", "friends", "friend", "follow", "followers",
  "following", "compare", "together", "share", "shared", "embed", "wrapped",
  "year", "recap", "notifications", "messages", "inbox", "go", "r", "u", "user",
  "users", "me", "you",
  // ── brand / roles / impersonation ──
  "official", "team", "staff", "mod", "mods", "moderator", "moderators",
  "support", "help", "helpdesk", "contact", "billing", "payments", "pay",
  "checkout", "subscribe", "security", "abuse", "report", "root", "system",
  "sysadmin", "null", "undefined", "none", "anonymous", "anon", "guest",
  "everyone", "all", "test", "demo", "example",
  // ── infra / system ──
  "www", "web", "mail", "email", "smtp", "ftp", "cdn", "assets", "static",
  "public", "media", "img", "images", "image", "files", "file", "download",
  "downloads", "app", "apps", "mobile", "ios", "android", "next", "vercel",
  // ── legal / meta ──
  "about", "terms", "tos", "privacy", "policy", "legal", "cookies", "gdpr",
  "dmca", "copyright", "press", "blog", "news", "careers", "jobs", "pricing",
  "plans", "upgrade", "pro", "premium", "status", "health", "ping",
  // ── abuse (starter — extend with a full wordlist) ──
  "fuck", "shit", "asshole", "bitch", "cunt", "nigger", "faggot", "rape",
  "porn", "sex", "nazi", "hitler",
]);

export type UsernameCheck = { ok: true; value: string } | { ok: false; error: string };

/** True if a candidate is reserved (also used by the route to know a path isn't a profile). */
export function isReservedUsername(name: string): boolean {
  return RESERVED.has(name.trim().toLowerCase());
}

/** Validate + normalize a username, or return a human-readable error. */
export function validateUsername(raw: string): UsernameCheck {
  const value = raw.trim().toLowerCase();

  if (value.length < 3 || value.length > 30) {
    return { ok: false, error: "Username must be 3–30 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(value)) {
    return { ok: false, error: "Use only lowercase letters, numbers, and underscore." };
  }
  if (value.startsWith("_") || value.endsWith("_")) {
    return { ok: false, error: "Username can’t start or end with an underscore." };
  }
  if (value.includes("__")) {
    return { ok: false, error: "No consecutive underscores." };
  }
  if (/^[0-9]+$/.test(value)) {
    return { ok: false, error: "Username can’t be all numbers." };
  }
  if (isReservedUsername(value)) {
    return { ok: false, error: "That username is reserved. Try another." };
  }
  return { ok: true, value };
}

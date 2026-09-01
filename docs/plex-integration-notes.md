# Bingeprint → Plex integration notes

A summary of Bingeprint's backend **logic and data sources** for building a
bolt-on that feeds a user's Bingeprint data into a Plex watchlist / watched
state. No infrastructure details — just what the data is, where it comes from,
and what it means.

---

## TL;DR for the integration

- **Everything is keyed to standard IDs.** Any show a user tracks carries a
  **TMDB ID, an IMDb ID, and a TheTVDB ID** — the same GUIDs Plex's agents match
  on. That's your join key; you should never need fuzzy title matching.
- The natural feed is **per user**: a list of shows with `{tmdb_id, imdb_id,
  tvdb_id, status, is_favorite}`, plus a per-episode **watched** set
  (`season/episode` numbers) and optional 1–10 ratings.
- Mapping is straightforward: `want_to_watch` (and optionally `watching` /
  favorites) → **Plex watchlist**; the watched-episode set → **Plex watched
  state**; ratings → **Plex ratings**.

---

## 1. Data source

- **TMDB (The Movie Database) is the single source of truth** for all content
  metadata (shows, seasons, episodes, cast, artwork, streaming availability).
  It sits behind a provider interface, so TheTVDB could be added later, but today
  every piece of content originates from and is keyed by **TMDB IDs**.
- Content is **cached into our own Postgres** as it's used, so reads are fast and
  don't hit TMDB — but the identifiers are TMDB's, plus the external IDs TMDB
  hands back.

### How the catalog gets populated (two tiers)

1. **Skeleton (whole universe):** a daily TMDB export gives one lightweight row
   for **every TV series** (~250k) — `tmdb_id`, name, popularity. This makes
   search/browse complete and popularity-ranked without crawling.
2. **On-demand detail:** the first time a show is **viewed or added to a
   library**, we do a full import — seasons, episodes, cast, artwork, streaming
   availability, and **external IDs**. A daily job re-syncs still-running tracked
   shows so air dates and new episodes stay current.

> Practical consequence for you: **skeleton-only shows have just a TMDB ID.**
> But **any show in a user's library has been fully imported**, so it always has
> IMDb + TVDB IDs and full episode data. The watchlist feed only ever contains
> tracked shows, so it's always fully identified.

---

## 2. Content identifiers (your join keys)

Retained on every fully-imported record:

| Entity  | IDs available                                   | Notes |
|---------|-------------------------------------------------|-------|
| Show    | `tmdb_id` (always), `imdb_id`, `tvdb_id`        | From TMDB `external_ids`. This is what Plex matches series on. |
| Season  | `tmdb_id`, `season_number`                      | |
| Episode | `tmdb_id`, `season_number`, `episode_number`, `air_date`, `runtime` | Match episodes by **show GUID + season/episode number** (most reliable across agents). |

Plex agents (TMDB/TVDB/IMDb) store GUIDs like `tmdb://`, `tvdb://`, `imdb://`.
Because we carry all three at the show level, you can match a Bingeprint show to
a Plex library item regardless of which agent that server uses.

---

## 3. Content model (shape, not storage)

- **Show:** name, overview, first/last air date, status (`Returning Series` /
  `Ended` / `Canceled` …), `in_production`, number of seasons/episodes,
  representative runtime, poster/backdrop, popularity, community vote average,
  genres, and the external IDs above.
- **Season:** number, name, air date, episode count.
- **Episode:** season/episode number, name, **air date**, runtime, still image,
  community rating.
- **Streaming availability** (per show, region-scoped, default `US`): which
  services carry it and how — `offer_type` is `flatrate | ads | free | rent |
  buy`. Services carry TMDB "watch provider" IDs + names (Netflix, Hulu, etc.).
  Sourced from TMDB `/watch/providers`.

---

## 4. Per-user data — the actual "feed"

This is what you'd sync to Plex. All of it is per-user.

### Library status — `user_shows`
One row per (user, show) with a status enum:

| Status | Meaning | Suggested Plex mapping |
|--------|---------|------------------------|
| `want_to_watch` | On the backlog | **Add to Plex watchlist** (primary) |
| `watching` | In progress | Watchlist and/or "in progress" |
| `watched` | Caught up on everything aired | Mark series watched (see §5) |
| `paused` | Set aside | (your call) |
| `abandoned` | Dropped | Probably ignore |

Plus `is_favorite` (boolean) and `added_at` / `started_at` / `completed_at`
timestamps.

### Watched episodes — `user_episodes`
One row per **watched episode**: `(user_id, episode → season/episode number,
watched_at)`. This is the granular watched state you'd scrobble to Plex.

**Important semantic:** *watched is defined against **aired** episodes only.*
- Marking a show "watched" marks every episode that has **aired** as watched, and
  never an unaired one.
- A show is considered "caught up / watched" when the user has watched all
  **aired** episodes — not all episodes that will ever exist. When a new episode
  airs, the show is no longer complete and re-surfaces to the user.
- So when you sync watched state, you'll only ever see episodes with an
  `air_date <= today`. You won't get phantom "watched" flags on unaired episodes.

### Ratings — `user_ratings`
Optional per show (or per episode): a numeric **1–10 rating** and/or a reaction
(`loved` / `liked` / `not_for_me`). Maps cleanly to Plex star ratings (÷2 for a
5-star scale) or thumbs.

### Streaming services the user has — `user_streaming_services`
Which services (TMDB provider IDs) the user subscribes to. We use it to bias
recommendations toward things they can actually stream; you could use it to
prioritize Plex-available vs. subscription content.

---

## 5. Watched-state mapping detail

To reflect Bingeprint watched state on Plex:

1. For each show in the user's library, match the Plex series by
   `tmdb://<tmdb_id>` (fall back to `tvdb://` / `imdb://`).
2. Pull the user's watched episodes for that show — you get `season_number` +
   `episode_number` for each.
3. Scrobble those specific episodes as watched in Plex.
4. `status = 'watched'` on a show is equivalent to "all aired episodes watched,"
   so you can treat it as "mark all aired episodes watched" if you don't want to
   enumerate — but enumerating `user_episodes` is exact and handles
   partially-watched shows too.

Direction is one-way as described (Bingeprint → Plex), but the same IDs make a
two-way sync possible later.

---

## 6. Recommendation logic (if you want a "recommended → watchlist" feed)

Recommendations are **derived on demand from the user's own activity** — there's
no editorial list. Logic:

- **Seeds** = shows the user watches/watched (favorites weighted highest) **plus**
  onboarding ratings (`loved` / `liked`).
- **Candidates** come from **TMDB's show-to-show recommendation graph** for each
  seed, tallied across seeds (a show surfaced by several of your shows ranks
  higher). We intentionally *don't* use "top-rated-by-genre" browsing as a
  personalization signal — it's a global signal, not a personal one.
- **Exclusions:** anything already in the library or previously dismissed.
- **Streaming preference:** shows on the user's services rank first; off-service
  ones still appear (labeled), so the list never starves.
- Output is two shelf types: **"Perfect For You"** (strongest cross-seed matches)
  and **"Because You Loved X"** (one row per top seed). Each rec carries the
  reason (which of your shows it came from).

Every recommended item is a normal show with the same external IDs, so
"recommended shows" is just as feedable to a watchlist as `want_to_watch`.

---

## 7. New-episode / upcoming logic

- A daily job re-imports detail for still-running tracked shows, so episode lists
  and **air dates** stay current.
- "New for you" = library shows (any status) that have an **unwatched episode
  that aired recently** (last ~30 days). "Upcoming" = episodes with a **future
  air date** for followed shows.
- Both are pure functions of `episodes.air_date` + the user's watched set — no
  separate feed needed; you can compute the same thing from the data above.

---

## 8. Suggested logical payload (per user)

Nothing like this endpoint exists yet, but this is the shape the data supports —
handy as a target for whatever pull/export we expose to you:

```json
{
  "user": "opaque-user-id",
  "shows": [
    {
      "tmdb_id": 125988,
      "imdb_id": "tt14688458",
      "tvdb_id": 371980,
      "name": "Silo",
      "status": "watched",
      "is_favorite": true,
      "rating": 9,
      "watched_episodes": [
        { "season": 1, "episode": 1 },
        { "season": 1, "episode": 2 }
      ]
    },
    {
      "tmdb_id": 97546,
      "imdb_id": "tt10986410",
      "tvdb_id": 383203,
      "name": "Ted Lasso",
      "status": "want_to_watch",
      "is_favorite": false,
      "rating": null,
      "watched_episodes": []
    }
  ]
}
```

That's enough to drive: **watchlist** (`status`/`is_favorite`), **watched state**
(`watched_episodes` matched by show GUID + S/E), and **ratings**.

---

*Questions worth pinning down before building:* which statuses should count as
"watchlist" on his side, whether he wants watched-state sync (episode-level) in
v1 or just the watchlist, and whether it should be pull (he polls an export) or
push (we notify on change). The data supports all of it.

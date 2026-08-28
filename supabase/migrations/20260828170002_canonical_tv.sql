-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — Canonical TV data                                             ║
-- ║ Provider-agnostic cache of shows/seasons/episodes/people/etc. Public read, ║
-- ║ service-role write. Every row keeps external IDs (tmdb/imdb/tvdb).          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Reference tables ────────────────────────────────────────────────────────
create table public.genres (
  id         uuid primary key default gen_random_uuid(),
  tmdb_id    integer unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.networks (
  id             uuid primary key default gen_random_uuid(),
  tmdb_id        integer unique not null,
  name           text not null,
  logo_path      text,
  origin_country text,
  created_at     timestamptz not null default now()
);

-- TMDB "watch providers" — where a show streams (region-scoped via join).
create table public.streaming_services (
  id         uuid primary key default gen_random_uuid(),
  tmdb_id    integer unique not null,
  name       text not null,
  logo_path  text,
  created_at timestamptz not null default now()
);

create table public.people (
  id                   uuid primary key default gen_random_uuid(),
  tmdb_id              integer unique not null,
  imdb_id              text,
  name                 text not null,
  profile_path         text,
  known_for_department text,
  popularity           numeric,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  synced_at            timestamptz not null default now()
);

-- ── Shows ───────────────────────────────────────────────────────────────────
create table public.shows (
  id                 uuid primary key default gen_random_uuid(),
  tmdb_id            integer unique not null,
  imdb_id            text,
  tvdb_id            integer,
  name               text not null,
  original_name      text,
  slug               text,
  overview           text,
  tagline            text,
  first_air_date     date,
  last_air_date      date,
  status             text,          -- Returning Series | Ended | Canceled | ...
  in_production      boolean,
  show_type          text,          -- Scripted | Documentary | ...
  original_language  text,
  homepage           text,
  poster_path        text,
  backdrop_path      text,
  popularity         numeric,
  vote_average       numeric,
  vote_count         integer,
  number_of_seasons  integer,
  number_of_episodes integer,
  episode_run_time   integer,       -- representative runtime (minutes)
  adult              boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  synced_at          timestamptz not null default now(),   -- last summary sync
  details_synced_at  timestamptz                            -- last full (seasons+episodes) sync
);

create index shows_name_trgm on public.shows using gin (name gin_trgm_ops);
create index shows_popularity_idx on public.shows (popularity desc nulls last);
create index shows_first_air_idx on public.shows (first_air_date);

create table public.seasons (
  id            uuid primary key default gen_random_uuid(),
  tmdb_id       integer unique,
  show_id       uuid not null references public.shows (id) on delete cascade,
  season_number integer not null,
  name          text,
  overview      text,
  air_date      date,
  poster_path   text,
  episode_count integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (show_id, season_number)
);
create index seasons_show_idx on public.seasons (show_id);

create table public.episodes (
  id             uuid primary key default gen_random_uuid(),
  tmdb_id        integer unique,
  show_id        uuid not null references public.shows (id) on delete cascade,
  season_id      uuid references public.seasons (id) on delete cascade,
  season_number  integer not null,
  episode_number integer not null,
  name           text,
  overview       text,
  air_date       date,
  runtime        integer,
  still_path     text,
  vote_average   numeric,
  vote_count     integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (show_id, season_number, episode_number)
);
create index episodes_show_idx on public.episodes (show_id, season_number, episode_number);
create index episodes_air_date_idx on public.episodes (air_date);

-- ── Relationships ───────────────────────────────────────────────────────────
create table public.credits (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid not null references public.shows (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  role       public.credit_role not null,
  character  text,
  "order"    integer,
  created_at timestamptz not null default now()
);
create index credits_show_idx on public.credits (show_id);
create index credits_person_idx on public.credits (person_id);

create table public.images (
  id           uuid primary key default gen_random_uuid(),
  show_id      uuid not null references public.shows (id) on delete cascade,
  image_type   text not null,           -- poster | backdrop
  file_path    text not null,
  width        integer,
  height       integer,
  aspect_ratio numeric,
  vote_average numeric,
  created_at   timestamptz not null default now(),
  unique (show_id, file_path)
);

create table public.show_genres (
  show_id  uuid not null references public.shows (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (show_id, genre_id)
);

create table public.show_networks (
  show_id    uuid not null references public.shows (id) on delete cascade,
  network_id uuid not null references public.networks (id) on delete cascade,
  primary key (show_id, network_id)
);

create table public.show_streaming (
  show_id    uuid not null references public.shows (id) on delete cascade,
  service_id uuid not null references public.streaming_services (id) on delete cascade,
  region     text not null default 'US',
  offer_type text not null default 'flatrate',   -- flatrate | rent | buy | ads | free
  primary key (show_id, service_id, region, offer_type)
);
create index show_streaming_show_idx on public.show_streaming (show_id);

-- ── Release events (upcoming episodes/premieres) — populated by cron in M8 ───
create table public.release_events (
  id             uuid primary key default gen_random_uuid(),
  show_id        uuid not null references public.shows (id) on delete cascade,
  episode_id     uuid references public.episodes (id) on delete set null,
  kind           public.release_event_kind not null,
  release_date   date not null,
  season_number  integer,
  episode_number integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index release_events_dedup
  on public.release_events (show_id, kind, release_date,
    coalesce(season_number, -1), coalesce(episode_number, -1));
create index release_events_date_idx on public.release_events (release_date);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create trigger people_set_updated_at   before update on public.people   for each row execute function public.set_updated_at();
create trigger shows_set_updated_at     before update on public.shows    for each row execute function public.set_updated_at();
create trigger seasons_set_updated_at   before update on public.seasons  for each row execute function public.set_updated_at();
create trigger episodes_set_updated_at  before update on public.episodes for each row execute function public.set_updated_at();
create trigger release_events_set_updated_at before update on public.release_events for each row execute function public.set_updated_at();

-- ── RLS: canonical data is world-readable; writes only via service role ──────
-- (service_role bypasses RLS, so no write policies are defined — anon/authed
--  clients get read-only access.)
do $$
declare t text;
begin
  foreach t in array array[
    'genres','networks','streaming_services','people','shows','seasons',
    'episodes','credits','images','show_genres','show_networks',
    'show_streaming','release_events'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      'public read ' || t, t);
  end loop;
end $$;

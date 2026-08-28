-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — Foundation                                                    ║
-- ║ Extensions, shared helpers, enums, and the user `profiles` table.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- case-insensitive usernames/emails
create extension if not exists "pg_trgm";     -- fuzzy search on titles/people

-- ── Shared helper: keep `updated_at` fresh on any row update ─────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Enums ───────────────────────────────────────────────────────────────────
-- The user's relationship with a show.
create type public.show_status as enum (
  'want_to_watch',
  'watching',
  'watched',
  'paused',
  'abandoned'
);

-- Lightweight reaction captured during onboarding and quick-rating.
create type public.reaction as enum (
  'loved',
  'liked',
  'not_for_me'
);

-- Feedback signals on a recommendation.
create type public.recommendation_feedback_kind as enum (
  'interested',
  'not_interested',
  'already_watched',
  'not_my_thing'
);

-- Categories of release/notification events.
create type public.release_event_kind as enum (
  'new_episode',
  'season_premiere',
  'premiere_announced',
  'renewed',
  'canceled',
  'finale_approaching'
);

-- Role a person plays on a show/episode.
create type public.credit_role as enum (
  'cast',
  'creator',
  'director',
  'writer',
  'producer'
);

-- ── profiles ────────────────────────────────────────────────────────────────
-- 1:1 with auth.users. Holds the app-level profile + public sharing flag.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      citext unique,
  display_name  text,
  avatar_url    text,
  bio           text,
  is_public     boolean not null default false,       -- private by default
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint username_format
    check (username is null or username ~ '^[a-z0-9_]{3,30}$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- A user can read their own profile; anyone can read a profile flagged public.
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: read public"
  on public.profiles for select
  using (is_public = true);

-- A user can update only their own profile.
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

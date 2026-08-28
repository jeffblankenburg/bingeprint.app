-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — User tracking + admin                                         ║
-- ║ user_shows (library), user_episodes (fact grain), user_ratings, and an     ║
-- ║ is_admin flag. All user-scoped tables are RLS-protected to their owner.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Admin flag for basic administration tooling.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ── user_shows: the user's library relationship with a show ──────────────────
create table public.user_shows (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  show_id      uuid not null references public.shows (id) on delete cascade,
  status       public.show_status not null default 'want_to_watch',
  is_favorite  boolean not null default false,
  added_at     timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, show_id)
);
create index user_shows_user_idx on public.user_shows (user_id, status);
create index user_shows_show_idx on public.user_shows (show_id);
create trigger user_shows_set_updated_at
  before update on public.user_shows
  for each row execute function public.set_updated_at();

-- ── user_episodes: the per-user watch fact grain (powers all stats) ──────────
create table public.user_episodes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete cascade,
  show_id    uuid not null references public.shows (id) on delete cascade,
  watched_at timestamptz not null default now(),
  unique (user_id, episode_id)
);
create index user_episodes_user_idx on public.user_episodes (user_id);
create index user_episodes_show_idx on public.user_episodes (user_id, show_id);
create index user_episodes_watched_idx on public.user_episodes (user_id, watched_at);

-- ── user_ratings: show- or episode-level rating / reaction ───────────────────
create table public.user_ratings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  show_id    uuid not null references public.shows (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  rating     smallint check (rating between 1 and 10),
  reaction   public.reaction,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One show-level rating per user; one rating per episode per user.
create unique index user_ratings_show_uniq
  on public.user_ratings (user_id, show_id) where episode_id is null;
create unique index user_ratings_episode_uniq
  on public.user_ratings (user_id, episode_id) where episode_id is not null;
create index user_ratings_user_idx on public.user_ratings (user_id);
create trigger user_ratings_set_updated_at
  before update on public.user_ratings
  for each row execute function public.set_updated_at();

-- ── RLS: each user sees/edits only their own rows ────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['user_shows','user_episodes','user_ratings'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id);',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id);',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id);',
      t || '_delete_own', t);
  end loop;
end $$;

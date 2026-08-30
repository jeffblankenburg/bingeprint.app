-- ── Public profile read path (M10) ──────────────────────────────────────────
-- A visitor (possibly logged-out) can view a user's shareable "Bingeprint card"
-- ONLY when that user has opted in via profiles.is_public = true. All the
-- underlying user_* tables stay RLS-locked to their owner; this security-definer
-- function is the single, audited seam that exposes a *curated aggregate* — never
-- granular watch history — and every row it returns is keyed off a profile that
-- passed the is_public gate.

create or replace function public.public_profile(p_username citext)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with prof as (
    select id, username, display_name, bio, avatar_url, created_at
    from public.profiles
    where username = p_username
      and is_public = true
  ),
  favs as (
    select s.tmdb_id, s.name, s.poster_path
    from prof
    join public.user_shows us
      on us.user_id = prof.id and us.is_favorite = true
    join public.shows s on s.id = us.show_id
    order by us.added_at desc
    limit 12
  ),
  stats as (
    select
      (select count(*) from public.user_shows us
         where us.user_id = prof.id) as shows_tracked,
      (select count(*) from public.user_shows us
         where us.user_id = prof.id and us.status = 'watched') as shows_completed,
      (select count(*) from public.user_episodes ue
         where ue.user_id = prof.id) as episodes_watched
    from prof
  ),
  genre_counts as (
    select g.name, count(*)::int as episodes
    from prof
    join public.user_episodes ue on ue.user_id = prof.id
    join public.show_genres sg on sg.show_id = ue.show_id
    join public.genres g on g.id = sg.genre_id
    group by g.name
    order by episodes desc, g.name
    limit 5
  )
  select case
    when not exists (select 1 from prof) then null
    else jsonb_build_object(
      'profile', (
        select to_jsonb(p) from (
          select username, display_name, bio, avatar_url, created_at from prof
        ) p
      ),
      'stats', (select to_jsonb(s) from stats s),
      'favorites', coalesce(
        (select jsonb_agg(jsonb_build_object(
           'tmdb_id', tmdb_id, 'name', name, 'poster_path', poster_path)) from favs),
        '[]'::jsonb),
      'top_genres', coalesce(
        (select jsonb_agg(jsonb_build_object(
           'name', name, 'episodes', episodes)) from genre_counts),
        '[]'::jsonb)
    )
  end;
$$;

-- Callable by logged-out visitors and signed-in users; the is_public gate lives
-- inside the function body, not in who may call it.
revoke all on function public.public_profile(citext) from public;
grant execute on function public.public_profile(citext) to anon, authenticated;

-- Hybrid "most watched actors": exact per-episode where TMDB gives us an
-- episode-level cast, show-level fallback where it doesn't. TMDB's per-episode
-- credits are uneven — for many older network episodes it lists no cast at all,
-- and the mains live only in the show's aggregate credits. Exact-only therefore
-- undercounts leads on those shows. So:
--   * episodes WITH per-episode credits  -> count real appearances (exact;
--     includes guest stars, excludes written-out cast)
--   * episodes WITHOUT any per-episode credits -> credit that show's regular
--     cast (best available estimate)
-- The two sets are disjoint by episode, so no double counting. We also return
-- `people_estimated` = true when any watched episode fell back, so the UI can
-- show a small disclaimer.
create or replace function public.user_insights()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with we as (
  select ue.episode_id, e.show_id, e.runtime, s.episode_run_time, s.first_air_date
  from user_episodes ue
  join episodes e on e.id = ue.episode_id
  join shows s on s.id = e.show_id
  where ue.user_id = auth.uid()
),
tot as (
  select
    count(*)::int as eps,
    count(distinct show_id)::int as shows,
    coalesce(sum(coalesce(runtime, episode_run_time, 0)), 0)::int as mins
  from we
),
ep_has_credits as (
  select we.episode_id, we.show_id,
         exists (
           select 1 from episode_credits ec
           where ec.episode_id = we.episode_id and ec.role = 'cast'
         ) as has_ec
  from we
),
person_eps as (
  -- exact: real per-episode appearances
  select ec.person_id, ec.episode_id
  from ep_has_credits h
  join episode_credits ec
    on ec.episode_id = h.episode_id and ec.role = 'cast'
  where h.has_ec
  union
  -- fallback: episodes with no per-episode cast -> show-level regular cast
  select c.person_id, h.episode_id
  from ep_has_credits h
  join credits c on c.show_id = h.show_id and c.role = 'cast'
  where not h.has_ec
)
select jsonb_build_object(
  'episodes_watched', (select eps from tot),
  'shows_watched', (select shows from tot),
  'minutes_watched', (select mins from tot),
  'shows_completed',
    (select count(*)::int from user_shows
      where user_id = auth.uid() and status = 'watched'),
  'people_estimated',
    (select exists (select 1 from ep_has_credits where not has_ec)),
  'genres', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.episodes desc), '[]'::jsonb)
    from (
      select g.name,
             count(*)::int as episodes,
             round(100.0 * count(*) / nullif((select eps from tot), 0))::int as pct
      from we
      join show_genres sg on sg.show_id = we.show_id
      join genres g on g.id = sg.genre_id
      group by g.name
      order by count(*) desc
      limit 8
    ) t
  ),
  'people', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.episodes desc), '[]'::jsonb)
    from (
      select p.tmdb_id, p.name, p.profile_path, count(*)::int as episodes
      from person_eps pe
      join people p on p.id = pe.person_id
      group by p.tmdb_id, p.name, p.profile_path
      order by count(*) desc
      limit 10
    ) t
  ),
  'decades', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.decade), '[]'::jsonb)
    from (
      select ((extract(year from first_air_date)::int / 10) * 10) as decade,
             count(*)::int as episodes
      from we
      where first_air_date is not null
      group by 1
      order by 1
    ) t
  )
);
$$;

-- Make "most watched actors" exact. Previously the people leaderboard joined
-- watched episodes to SHOW-level credits, so an actor was credited for every
-- watched episode of any show they're cast in — even episodes they never appear
-- in. Now it joins to episode_credits (populated per-episode by the enrichment
-- job + enrich-credits cron), so the count is the true number of *watched
-- episodes the person actually appears in*.
--
-- episode_credits stores both regular cast and guest stars with role='cast'
-- (source distinguishes them), and is unique per (episode, person, role), so
-- count(*) is one-per-episode with no double counting. Episodes not yet enriched
-- simply don't contribute until the daily cron fills them; the RPC recomputes
-- live, so the number self-corrects.
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
)
select jsonb_build_object(
  'episodes_watched', (select eps from tot),
  'shows_watched', (select shows from tot),
  'minutes_watched', (select mins from tot),
  'shows_completed',
    (select count(*)::int from user_shows
      where user_id = auth.uid() and status = 'watched'),
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
      from we
      join episode_credits ec
        on ec.episode_id = we.episode_id and ec.role = 'cast'
      join people p on p.id = ec.person_id
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

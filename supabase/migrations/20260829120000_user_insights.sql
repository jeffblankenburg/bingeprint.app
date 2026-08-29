-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — Insights aggregation                                          ║
-- ║ On-demand stats for the signed-in user, computed from their watch history. ║
-- ║ security invoker + auth.uid() → RLS ensures a user only sees their own.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function public.user_insights()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with we as (
  select e.show_id, e.runtime, s.episode_run_time, s.first_air_date
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
  'networks', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.episodes desc), '[]'::jsonb)
    from (
      select n.name, count(*)::int as episodes
      from we
      join show_networks sn on sn.show_id = we.show_id
      join networks n on n.id = sn.network_id
      group by n.name
      order by count(*) desc
      limit 6
    ) t
  ),
  'people', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.episodes desc), '[]'::jsonb)
    from (
      select p.name, count(*)::int as episodes
      from we
      join credits c on c.show_id = we.show_id
      join people p on p.id = c.person_id
      where c.role = 'cast'
      group by p.name
      order by count(*) desc
      limit 8
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

revoke all on function public.user_insights() from anon;
grant execute on function public.user_insights() to authenticated;

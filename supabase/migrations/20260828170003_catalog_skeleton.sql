-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — Catalog skeleton upsert                                       ║
-- ║ Bulk-load lightweight show rows from the TMDB daily ID export without      ║
-- ║ clobbering the localized name/overview/detail of already-imported shows.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Accepts a JSON array of { tmdb_id, name, popularity, adult } and upserts each
-- into `shows`. On conflict it refreshes ONLY popularity/adult/synced_at — never
-- name/overview/details_synced_at — so a full import is never overwritten by the
-- (original-language-only) skeleton. Returns the number of rows affected.
create or replace function public.catalog_upsert_skeleton(rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  insert into public.shows (tmdb_id, name, popularity, adult)
  select
    (r->>'tmdb_id')::integer,
    coalesce(nullif(r->>'name', ''), 'Untitled'),
    nullif(r->>'popularity', '')::numeric,
    coalesce((r->>'adult')::boolean, false)
  from jsonb_array_elements(rows) as r
  on conflict (tmdb_id) do update
    set popularity = excluded.popularity,
        adult      = excluded.adult,
        synced_at  = now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Service-role only (the catalog sync runs server-side with the service key).
revoke all on function public.catalog_upsert_skeleton(jsonb) from public;
revoke all on function public.catalog_upsert_skeleton(jsonb) from anon;
revoke all on function public.catalog_upsert_skeleton(jsonb) from authenticated;
grant execute on function public.catalog_upsert_skeleton(jsonb) to service_role;

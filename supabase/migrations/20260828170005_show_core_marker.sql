-- Split show import into "core" (detail/artwork/cast — fast, 1 API call) and
-- "episodes" (per-season fetch — slower). core_synced_at lets the show page
-- render the hero immediately and stream episodes in afterward.
alter table public.shows
  add column if not exists core_synced_at timestamptz;

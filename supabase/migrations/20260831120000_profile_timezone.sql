-- Per-user timezone so release dates ("has it aired?", Upcoming buckets) resolve
-- in the user's own local calendar day rather than UTC. Auto-detected from the
-- device on first app load; overridable in settings. Defaults to US Eastern
-- (where all current users are) until detection runs.
alter table public.profiles
  add column if not exists timezone text not null default 'America/New_York';

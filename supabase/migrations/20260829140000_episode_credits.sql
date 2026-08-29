-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — Exact per-episode credits                                     ║
-- ║ Enables precise person-level stats ("% of watched episodes featuring X").  ║
-- ║ Enriched when a show is first tracked. Public read, service-role write.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.episode_credits (
  id            uuid primary key default gen_random_uuid(),
  episode_id    uuid not null references public.episodes (id) on delete cascade,
  person_id     uuid not null references public.people (id) on delete cascade,
  role          public.credit_role not null,
  character     text,
  billing_order integer,
  source        text,                       -- cast | guest | crew
  created_at    timestamptz not null default now(),
  unique (episode_id, person_id, role)
);
create index episode_credits_person_idx on public.episode_credits (person_id);
create index episode_credits_episode_idx on public.episode_credits (episode_id);

-- Idempotent, resumable enrichment markers.
alter table public.episodes add column if not exists credits_synced_at timestamptz;
alter table public.shows add column if not exists episode_credits_synced_at timestamptz;

alter table public.episode_credits enable row level security;
create policy "public read episode_credits"
  on public.episode_credits for select to anon, authenticated using (true);

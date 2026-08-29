-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — Recommendations                                               ║
-- ║ Per-user recommendations (with an explanation) + feedback signals.         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.recommendations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  show_id    uuid not null references public.shows (id) on delete cascade,
  score      numeric not null default 0,
  reason     jsonb not null default '{}'::jsonb,      -- { because: ["Severance", ...] }
  collection text not null default 'perfect_for_you',
  created_at timestamptz not null default now(),
  unique (user_id, show_id, collection)
);
create index recommendations_user_idx
  on public.recommendations (user_id, collection, score desc);

create table public.recommendation_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  show_id    uuid not null references public.shows (id) on delete cascade,
  feedback   public.recommendation_feedback_kind not null,
  created_at timestamptz not null default now(),
  unique (user_id, show_id)
);
create index recommendation_feedback_user_idx
  on public.recommendation_feedback (user_id);

-- When we last generated recs for a user (staleness + de-dupe of runs).
alter table public.profiles
  add column if not exists recs_generated_at timestamptz;

-- ── RLS: each user owns their recommendations + feedback ─────────────────────
do $$
declare t text;
begin
  foreach t in array array['recommendations','recommendation_feedback'] loop
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

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Bingeprint — User streaming services                                       ║
-- ║ Which services a user subscribes to, so recommendations only surface shows ║
-- ║ they can actually watch. (Tracking/favoriting is never gated by this.)     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Display priority from TMDB's provider list, for ordering the picker.
alter table public.streaming_services
  add column if not exists display_priority integer;
create index if not exists streaming_services_priority_idx
  on public.streaming_services (display_priority nulls last);

create table public.user_streaming_services (
  user_id    uuid not null references auth.users (id) on delete cascade,
  service_id uuid not null references public.streaming_services (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (user_id, service_id)
);

alter table public.user_streaming_services enable row level security;
create policy "uss_select_own" on public.user_streaming_services
  for select using (auth.uid() = user_id);
create policy "uss_insert_own" on public.user_streaming_services
  for insert with check (auth.uid() = user_id);
create policy "uss_delete_own" on public.user_streaming_services
  for delete using (auth.uid() = user_id);

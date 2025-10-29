-- =========================================
-- Safe schema for 3D generation job tracking
-- =========================================

-- 1) Enums (idempotent)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'generation_source') then
    create type public.generation_source as enum ('image','text','multi-image');
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type public.generation_status as enum ('PENDING','IN_PROGRESS','SUCCEEDED','FAILED','DELETED');
  end if;
end$$;

-- 2) Table (idempotent)
create table if not exists public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid references public.designs(id) on delete set null,
  source public.generation_source not null,
  mode text not null,                     -- 'image-to-3d' | 'multi-image-to-3d' | 'text-to-3d:preview/refine'
  prompt text,
  input_image_urls text[],
  meshy_task_id text unique,
  status public.generation_status not null default 'PENDING',
  progress int default 0,
  thumbnail_url text,
  model_glb_url text,
  model_fbx_url text,
  model_usdz_url text,
  texture_urls jsonb,
  error jsonb,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- 3) RLS (least privilege)
alter table public.generation_tasks enable row level security;

-- Users may READ only their own tasks (client polling)
drop policy if exists gen_select_own on public.generation_tasks;
create policy gen_select_own
on public.generation_tasks
for select
to authenticated
using (auth.uid() = user_id);

-- Optional: allow users to delete their own tasks (safe; remove if not needed)
drop policy if exists gen_delete_own on public.generation_tasks;
create policy gen_delete_own
on public.generation_tasks
for delete
to authenticated
using (auth.uid() = user_id);

-- NOTE:
-- Do NOT create insert/update policies for clients.
-- Inserts and updates are performed by the Edge Function with the service role,
-- which bypasses RLS by design.

-- 4) Helpful indexes (idempotent)
create index if not exists idx_generation_tasks_user_created
  on public.generation_tasks(user_id, created_at desc);
create index if not exists idx_generation_tasks_status
  on public.generation_tasks(status);
create index if not exists idx_generation_tasks_meshy_id
  on public.generation_tasks(meshy_task_id);

-- 5) (Optional) Minimal events table if not present, to avoid function errors
create table if not exists public.events_analytics (
  id bigserial primary key,
  event text not null,
  user_id uuid,
  design_id uuid,
  ts timestamptz default now(),
  props jsonb
);

-- 6) Ask PostgREST to reload schema so new table/policies are visible immediately
notify pgrst, 'reload schema';

-- ===== Quick verification (run manually in SQL editor) =====
-- select * from public.generation_tasks limit 1;
-- check pg_policies:
-- select polname, cmd, roles from pg_policies
-- where schemaname='public' and tablename='generation_tasks';

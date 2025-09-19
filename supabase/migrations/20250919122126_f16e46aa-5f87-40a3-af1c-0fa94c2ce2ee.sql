-- 1) Create public bucket (idempotent)
insert into storage.buckets (id, name, public)
values ('reference-designs', 'reference-designs', true)
on conflict (id) do nothing;

-- 2) Storage RLS (bucket-scoped)
-- Public read (list/get) ONLY for this bucket
drop policy if exists "refdesigns_public_read" on storage.objects;
create policy "refdesigns_public_read"
on storage.objects
for select
using (bucket_id = 'reference-designs');

-- Admin create
drop policy if exists "refdesigns_admin_insert" on storage.objects;
create policy "refdesigns_admin_insert"
on storage.objects
for insert
with check (
  bucket_id = 'reference-designs'
  and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
);

-- Admin update (visibility + stay-in-bucket)
drop policy if exists "refdesigns_admin_update" on storage.objects;
create policy "refdesigns_admin_update"
on storage.objects
for update
using (
  bucket_id = 'reference-designs'
  and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
)
with check (
  bucket_id = 'reference-designs'
  and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
);

-- Admin delete
drop policy if exists "refdesigns_admin_delete" on storage.objects;
create policy "refdesigns_admin_delete"
on storage.objects
for delete
using (
  bucket_id = 'reference-designs'
  and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
);

-- 3) Reference designs table
create table if not exists public.reference_designs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,                            
  title text not null,
  description text,
  product_id uuid references public.products(id) on delete set null,
  params jsonb,
  preview_url text not null,
  thumb_url text,
  tags text[] default '{}',
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- Enforce lowercase slug + uniqueness
drop index if exists uq_reference_designs_slug_lower;
create unique index uq_reference_designs_slug_lower
  on public.reference_designs (lower(slug));

-- Helpful indexes
drop index if exists idx_reference_designs_featured;
create index idx_reference_designs_featured
  on public.reference_designs (is_featured desc, created_at desc);
  
drop index if exists idx_reference_designs_product;
create index idx_reference_designs_product
  on public.reference_designs (product_id);

-- RLS
alter table public.reference_designs enable row level security;

-- Public read (curated, non-PII)
drop policy if exists "reference_designs_public_read" on public.reference_designs;
create policy "reference_designs_public_read"
on public.reference_designs for select using (true);

-- Admin write
drop policy if exists "reference_designs_admin_write" on public.reference_designs;
create policy "reference_designs_admin_write"
on public.reference_designs for all
using (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
with check (coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin');

-- Public view (optional, handy for SEO pages)
drop view if exists public.v_reference_designs;
create view public.v_reference_designs as
  select id, slug, title, description, preview_url, thumb_url, tags, is_featured, created_at
  from public.reference_designs;
grant select on public.v_reference_designs to anon, authenticated;
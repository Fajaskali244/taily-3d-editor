-- Fix the security definer view issue by recreating it without security definer
drop view if exists public.v_reference_designs;
create view public.v_reference_designs 
security invoker
as
  select id, slug, title, description, preview_url, thumb_url, tags, is_featured, created_at
  from public.reference_designs;
grant select on public.v_reference_designs to anon, authenticated;
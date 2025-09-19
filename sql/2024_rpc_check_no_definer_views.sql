create or replace function public.check_no_definer_views()
returns jsonb
language plpgsql
security definer  -- allowed; returns a count only, not data
as $$
declare cnt int;
begin
  select count(*) into cnt
  from information_schema.views
  where table_schema = 'public'
    and security_type = 'DEFINER';
  return jsonb_build_object('count', cnt);
end;
$$;

revoke all on function public.check_no_definer_views() from public;
grant execute on function public.check_no_definer_views() to anon, authenticated;
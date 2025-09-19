-- Ensure we are on Postgres 15+ so SECURITY INVOKER is supported
-- (Supabase uses PG 15+; this is a safety comment for maintainers)

do $$
declare
  r record;
  vname text;
  vschema text;
  vdef text;
  had_anon boolean;
  had_auth boolean;
begin
  for r in
    select
      n.nspname as schema_name,
      c.relname as view_name,
      pg_get_viewdef(c.oid, true) as view_sql,
      case when v.security_barrier then 'YES' else 'NO' end as is_security_barrier,
      case when c.relrowsecurity then 'YES' else 'NO' end as rls_enabled,
      -- SECURITY DEFINER vs INVOKER since PG15: information_schema.views.security_type
      (select security_type from information_schema.views
        where table_schema = n.nspname and table_name = c.relname) as security_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_views v on v.schemaname = n.nspname and v.viewname = c.relname
    where c.relkind = 'v'  -- ordinary view (exclude materialized views here)
      and n.nspname = 'public'
  loop
    if coalesce(r.security_type, 'INVOKER') = 'DEFINER' then
      vname := quote_ident(r.view_name);
      vschema := quote_ident(r.schema_name);

      -- check prior grants
      select exists(
        select 1 from information_schema.role_table_grants
        where table_schema = r.schema_name and table_name = r.view_name
          and grantee = 'anon' and privilege_type = 'SELECT'
      ) into had_anon;

      select exists(
        select 1 from information_schema.role_table_grants
        where table_schema = r.schema_name and table_name = r.view_name
          and grantee = 'authenticated' and privilege_type = 'SELECT'
      ) into had_auth;

      -- capture original definition
      select pg_get_viewdef(format('%I.%I', r.schema_name, r.view_name)::regclass, true)
      into vdef;

      -- drop and recreate as SECURITY INVOKER
      execute format('drop view if exists %s.%s cascade;', vschema, vname);
      execute format('create view %s.%s security invoker as %s;', vschema, vname, vdef);

      -- re-grant previous privileges
      if had_anon then
        execute format('grant select on %s.%s to anon;', vschema, vname);
      end if;
      if had_auth then
        execute format('grant select on %s.%s to authenticated;', vschema, vname);
      end if;
    end if;
  end loop;
end$$;